/**
 * Profile data hook combining on-chain reads and backend profile enrichment.
 *
 * Uses on-chain data as a fallback when the backend session is unavailable.
 */
"use client";
import { useEffect, useState, useCallback } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useWriteContract, useAccount, usePublicClient, useChainId } from "wagmi";
import { baseSepolia } from "wagmi/chains";
import { identityAddress, identityAbi, usernameRegistryAddress, usernameRegistryAbi } from "../lib/contracts";
import { useBackendAuth } from "./useBackendAuth";
import { formatAchievoId } from "../lib/userId";
import { normalizeUsername, validateUsername } from "../lib/username";

/** View model for profile information displayed in the UI. */
export type ProfileInfo = {
  displayName: string;
  achievoId: string;
  username: string;
  bio: string;
  about: string;
  avatar: string;
  walletAddress: string;
  goalsCount: number;
  badgesCount: number;
  pendingApprovals: number;
  verifiedGoalsCount: number;
  inProgressGoalsCount: number;
  totalXP: number;
  level: number;
};

const defaultProfile: ProfileInfo = {
  displayName: "",
  achievoId: "",
  username: "",
  bio: "",
  about: "",
  avatar: "",
  walletAddress: "",
  goalsCount: 0,
  badgesCount: 0,
  pendingApprovals: 0,
  verifiedGoalsCount: 0,
  inProgressGoalsCount: 0,
  totalXP: 0,
  level: 1,
};

// Requests route through the Next.js API proxy to preserve cookie credentials.
const API_BASE = "/api";

/** Loads profile data and exposes profile update actions. */
export function useProfileInfo() {
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { token } = useBackendAuth();
  const { writeContractAsync } = useWriteContract();

  const [profile, setProfile] = useState<ProfileInfo>(defaultProfile);
  const [isLoaded, setIsLoaded] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingDisplayName, setSavingDisplayName] = useState(false);
  const [error, setError] = useState<string>("");

  const fetchProfile = useCallback(async () => {
    if (!address) {
      setProfile(defaultProfile);
      setIsLoaded(true);
      return;
    }

    let nextProfile: ProfileInfo = { ...defaultProfile };
    let usedBackend = false;

    // On-chain identity fallback for unauthenticated sessions.
    if (identityAddress && publicClient) {
      try {
        const userId = (await publicClient.readContract({
          address: identityAddress,
          abi: identityAbi,
          functionName: "getUserId",
          args: [address as `0x${string}`],
        })) as bigint;
        if (userId && userId !== 0n) {
          const prof = (await publicClient.readContract({
            address: identityAddress,
            abi: identityAbi,
            functionName: "getProfile",
            args: [userId],
          })) as readonly [string, string, string, string];
          nextProfile = {
            ...nextProfile,
            username: prof?.[0] || "",
            bio: prof?.[1] || "",
            about: prof?.[2] || "",
            avatar: prof?.[3] || "",
            achievoId: formatAchievoId(userId) || "",
          };
        }
      } catch {
        // Ignore on-chain read failures to keep the UI responsive.
      }
    }

    // Backend profile fallback without authentication.
    if (API_BASE && address) {
      try {
        const res = await fetch(`${API_BASE}/achievo/profile/${address}`);
        if (res.ok) {
          const json = await res.json();
          const data = json.data || json.profile || {};
          nextProfile = {
            ...nextProfile,
            username: data.username || nextProfile.username,
            bio: data.bio || nextProfile.bio,
            about: data.about || nextProfile.about,
            avatar: data.avatar || nextProfile.avatar,
            achievoId: data.achusrId || data.achievoId || nextProfile.achievoId,
          };
        }
      } catch {
        // Ignore fallback read failures to avoid blocking the UI.
      }
    }

    // Authenticated backend profile overrides fallback fields.
    if (token && API_BASE) {
      const res = await fetch(`${API_BASE}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || {};
        usedBackend = true;
        nextProfile = {
          ...nextProfile,
          // Only override fields when the backend returns a value to avoid blanking on-chain data.
          displayName: data.displayName || nextProfile.displayName,
          achievoId: data.achusrId || data.achievoId || nextProfile.achievoId,
          username: data.username || nextProfile.username,
          bio: data.bio || nextProfile.bio,
          about: data.about || nextProfile.about,
          avatar: data.avatar || nextProfile.avatar,
          walletAddress: data.walletAddress || nextProfile.walletAddress,
          goalsCount: data.goalsCount ?? nextProfile.goalsCount,
          badgesCount: data.badgesCount ?? nextProfile.badgesCount,
          pendingApprovals: data.pendingApprovals ?? nextProfile.pendingApprovals,
          verifiedGoalsCount: data.verifiedGoalsCount ?? nextProfile.verifiedGoalsCount,
          inProgressGoalsCount: data.inProgressGoalsCount ?? nextProfile.inProgressGoalsCount,
          totalXP: data.totalXP ?? nextProfile.totalXP,
          level: data.level ?? nextProfile.level,
        };
      } else {
        setError("Failed to load profile");
      }
    }

    // On-chain counts without authentication.
    if (!usedBackend) {
      try {
        const tasksRes = await fetch(`${API_BASE}/achievo/tasks/${address}`);
        const badgesRes = await fetch(`${API_BASE}/achievo/badges/${address}`);
        const tasksJson = tasksRes.ok ? await tasksRes.json() : { data: [] };
        const badgesJson = badgesRes.ok ? await badgesRes.json() : { data: [] };
        const tasks = Array.isArray(tasksJson.data) ? tasksJson.data : [];
        const badges = Array.isArray(badgesJson.data) ? badgesJson.data : [];
        const pending = tasks.filter((t: any) => t.status === "SUBMITTED" || t.status === "PENDING_PEER").length;
        const verified = tasks.filter((t: any) => t.status === "VERIFIED" || t.status === "BADGED").length;
        const inProgress = tasks.filter((t: any) => t.status === "SUBMITTED" || t.status === "PENDING_PEER").length;
        const xp = tasks.reduce((acc: number, t: any) => {
          if (t.status === "BADGED") return acc + 20;
          if (t.status === "VERIFIED") return acc + 10;
          if (t.status === "SUBMITTED") return acc + 2;
          return acc;
        }, 0);
        const level = xp >= 600 ? 5 : xp >= 300 ? 4 : xp >= 150 ? 3 : xp >= 50 ? 2 : 1;
        nextProfile = {
          ...nextProfile,
          goalsCount: tasks.length || nextProfile.goalsCount,
          badgesCount: badges.length || nextProfile.badgesCount,
          pendingApprovals: pending || nextProfile.pendingApprovals,
          verifiedGoalsCount: verified || nextProfile.verifiedGoalsCount,
          inProgressGoalsCount: inProgress || nextProfile.inProgressGoalsCount,
          totalXP: xp || nextProfile.totalXP,
          level: level || nextProfile.level,
        };
      } catch {
        // Ignore count failures and keep the last known values.
      }
    }

    setProfile(nextProfile);
    setError("");
    setIsLoaded(true);
  }, [address, identityAddress, publicClient, token]);

  useEffect(() => {
    let active = true;
    (async () => {
      await fetchProfile();
      if (active) setIsLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [address, token, fetchProfile]);

  const saveProfile = useCallback(
    async (updates: Pick<ProfileInfo, "username" | "bio" | "about" | "avatar">) => {
      if (!address) {
        setError("Connect wallet first");
        return;
      }
      setSavingProfile(true);
      setError("");
      try {
        const sanitizedUsername = updates.username ? updates.username.replace(/^@/, "").toLowerCase() : "";
        await writeContractAsync({
          address: identityAddress,
          abi: identityAbi,
          functionName: "setProfile",
          args: [sanitizedUsername, updates.bio, updates.about, updates.avatar],
          chainId: baseSepolia.id,
        });
        await fetchProfile();
      } catch (e: any) {
        setError(e?.message || "Failed to save profile");
      } finally {
        setSavingProfile(false);
      }
    },
    [address, writeContractAsync, fetchProfile],
  );

  const claimUsername = useCallback(
    async (username: string) => {
      if (!address) {
        throw new Error("Connect wallet first");
      }
      if (!token) {
        throw new Error("Not signed in");
      }
      if (!usernameRegistryAddress) {
        throw new Error("Username registry not configured");
      }
      const cleaned = username.trim().startsWith("@") ? username.trim().slice(1) : username.trim();
      if (!cleaned) {
        throw new Error("Enter a username");
      }
      const normalized = normalizeUsername(cleaned).normalized;
      const validation = validateUsername(normalized);
      if (!validation.valid) {
        throw new Error("Invalid username");
      }
      setError("");
      await writeContractAsync({
        address: usernameRegistryAddress,
        abi: usernameRegistryAbi,
        functionName: "claimUsername",
        args: [cleaned],
        chainId: chainId || baseSepolia.id,
      });
      const res = await fetch(`${API_BASE}/identity/username`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ username: cleaned }),
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res));
      }
      await fetchProfile();
    },
    [address, token, usernameRegistryAddress, writeContractAsync, fetchProfile, chainId],
  );

  const saveDisplayName = useCallback(
    async (displayName: string) => {
      if (!token) {
        setError("Not signed in");
        return;
      }
      setSavingDisplayName(true);
      setError("");
      try {
        await fetch(`${API_BASE}/profile/me`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ displayName }),
        });
        await fetchProfile();
      } catch (e: any) {
        setError(e?.message || "Failed to update display name");
      } finally {
        setSavingDisplayName(false);
      }
    },
    [token, fetchProfile],
  );

  return {
    profile,
    isLoaded,
    saveProfile,
    claimUsername,
    saveDisplayName,
    savingProfile,
    savingDisplayName,
    error,
    reload: fetchProfile,
  };
}
