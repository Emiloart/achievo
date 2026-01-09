/**
 * Risk profile hook.
 *
 * Retrieves risk assessment data for the authenticated user.
 */
"use client";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useBackendAuth } from "./useBackendAuth";

/** Risk profile summary returned by the backend. */
export type RiskProfile = {
  userId: string;
  riskVersion: string;
  riskScore: number;
  riskLevel: string;
  signals: any[];
  lastEvaluatedAt?: string | null;
  engineEnabled?: boolean;
};

/** Loads risk profile data for the specified user. */
export function useRiskProfile(userId?: string) {
  const { token } = useBackendAuth();
  const [profile, setProfile] = useState<RiskProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchRisk = useCallback(async () => {
    if (!userId || !token) {
      setProfile(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${userId}/risk`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setProfile(json?.data || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load risk profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    void fetchRisk();
  }, [fetchRisk]);

  return { profile, loading, error, refetch: fetchRisk };
}
