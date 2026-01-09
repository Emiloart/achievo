/**
 * Public profile hook.
 *
 * Loads public-facing profile data without requiring authentication.
 */
"use client";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";

/** Public profile data returned for unauthenticated viewers. */
export type PublicProfile = {
  displayName: string;
  achusrId: string;
  achievoId: string;
  username: string;
  bio: string;
  about: string;
  avatar: string;
  walletAddress: string;
};

const API_BASE = "/api";

const defaultProfile: PublicProfile = {
  displayName: "",
  achusrId: "",
  achievoId: "",
  username: "",
  bio: "",
  about: "",
  avatar: "",
  walletAddress: "",
};

/** Loads a public profile by wallet address. */
export function usePublicProfile(address?: string) {
  const [profile, setProfile] = useState<PublicProfile>(defaultProfile);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!address) {
      setProfile(defaultProfile);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/achievo/profile/${address}`);
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const data = json.data || {};
      setProfile({
        displayName: data.displayName || "",
        achusrId: data.achusrId || data.achievoId || "",
        achievoId: data.achusrId || data.achievoId || "",
        username: data.username || "",
        bio: data.bio || "",
        about: data.about || "",
        avatar: data.avatar || "",
        walletAddress: data.walletAddress || address,
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load profile");
      setProfile(defaultProfile);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  return { profile, loading, error, refetch: fetchProfile };
}
