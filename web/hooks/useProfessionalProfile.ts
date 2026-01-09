/**
 * Professional profile hook.
 *
 * Loads and updates the authenticated user's professional profile data.
 */
"use client";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useBackendAuth } from "./useBackendAuth";

/** Professional profile content fields. */
export type ProfessionalProfile = {
  headline: string | null;
  currentRole: string | null;
  currentOrg: string | null;
  location: string | null;
  timezone: string | null;
  bioShort: string | null;
  skills: string[];
  industries: string[];
  availability: string;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  currency: string | null;
  websiteUrl: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  xUrl: string | null;
  portfolioUrl: string | null;
  isPublic: boolean;
};

/** Identity fields associated with a professional profile. */
export type ProfessionalIdentity = {
  achusrId: string;
  username: string;
  displayName: string;
  avatar: string;
  walletAddress?: string;
};

/** Aggregate stats displayed alongside a professional profile. */
export type ProfessionalStats = {
  xpTotal: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  goalsCompleted: number;
  badgesCount: number;
  partiesCount: number;
};

/** Highlighted item associated with the professional profile. */
export type HighlightItem = {
  id: string;
  type: string;
  ref: string;
  position: number;
  goal?: {
    goalId: string;
    goalCID: string;
    level: number;
    verified: boolean;
    verifiedAt?: string | null;
    createdAt?: string | null;
  };
  badge?: { tokenId: string; name?: string; imageUrl?: string };
  party?: { id: string; name: string; slug: string; membersCount: number };
};

/** Backend response shape for a professional profile fetch. */
export type ProfessionalProfileResponse = {
  identity: ProfessionalIdentity;
  professional: ProfessionalProfile;
  stats: ProfessionalStats;
  highlights: { pinnedItems: HighlightItem[] };
};

const defaultProfessional: ProfessionalProfile = {
  headline: null,
  currentRole: null,
  currentOrg: null,
  location: null,
  timezone: null,
  bioShort: null,
  skills: [],
  industries: [],
  availability: "UNSPECIFIED",
  hourlyRateMin: null,
  hourlyRateMax: null,
  currency: null,
  websiteUrl: null,
  githubUrl: null,
  linkedinUrl: null,
  xUrl: null,
  portfolioUrl: null,
  isPublic: true,
};

const defaultIdentity: ProfessionalIdentity = {
  achusrId: "",
  username: "",
  displayName: "",
  avatar: "",
  walletAddress: "",
};

const defaultStats: ProfessionalStats = {
  xpTotal: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  goalsCompleted: 0,
  badgesCount: 0,
  partiesCount: 0,
};

const defaultResponse: ProfessionalProfileResponse = {
  identity: defaultIdentity,
  professional: defaultProfessional,
  stats: defaultStats,
  highlights: { pinnedItems: [] },
};

const API_BASE = "/api";

/** Loads and updates the authenticated user's professional profile. */
export function useProfessionalProfile() {
  const { token } = useBackendAuth();
  const [data, setData] = useState<ProfessionalProfileResponse>(defaultResponse);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!token) {
      setData(defaultResponse);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/profile/professional/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setData({
        identity: json.identity || defaultIdentity,
        professional: json.professional || defaultProfessional,
        stats: json.stats || defaultStats,
        highlights: json.highlights || { pinnedItems: [] },
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load professional profile");
      setData(defaultResponse);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const saveProfessional = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!token) throw new Error("Not signed in");
      setSaving(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/profile/professional/me`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        setData({
          identity: json.identity || defaultIdentity,
          professional: json.professional || defaultProfessional,
          stats: json.stats || defaultStats,
          highlights: json.highlights || { pinnedItems: [] },
        });
      } catch (e: any) {
        setError(e?.message || "Failed to update professional profile");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  return {
    data,
    professional: data.professional,
    identity: data.identity,
    stats: data.stats,
    highlights: data.highlights,
    loading,
    saving,
    error,
    refetch: fetchProfile,
    saveProfessional,
  };
}
