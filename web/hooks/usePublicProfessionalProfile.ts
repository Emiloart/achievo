/**
 * Public professional profile hook.
 *
 * Fetches professional profile details for unauthenticated viewers.
 */
"use client";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import type { ProfessionalProfileResponse } from "./useProfessionalProfile";

const API_BASE = "/api";

const defaultResponse: ProfessionalProfileResponse = {
  identity: { achusrId: "", username: "", displayName: "", avatar: "", walletAddress: "" },
  professional: {
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
  },
  stats: {
    xpTotal: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    goalsCompleted: 0,
    badgesCount: 0,
    partiesCount: 0,
  },
  highlights: { pinnedItems: [] },
};

/** Loads a public professional profile by handle. */
export function usePublicProfessionalProfile(handle?: string) {
  const [data, setData] = useState<ProfessionalProfileResponse>(defaultResponse);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!handle) {
      setData(defaultResponse);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/profile/professional/public/${encodeURIComponent(handle)}`);
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setData({
        identity: json.identity || defaultResponse.identity,
        professional: json.professional || defaultResponse.professional,
        stats: json.stats || defaultResponse.stats,
        highlights: json.highlights || { pinnedItems: [] },
      });
    } catch (e: any) {
      setError(e?.message || "No professional profile available");
      setData(defaultResponse);
    } finally {
      setLoading(false);
    }
  }, [handle]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  return { data, loading, error, refetch: fetchProfile };
}
