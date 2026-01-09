/**
 * Consistency score hook.
 *
 * Fetches and refreshes consistency metrics for the authenticated user.
 */
"use client";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useBackendAuth } from "./useBackendAuth";

/** Consistency score returned by the backend. */
export type ConsistencyScore = {
  userId: string;
  scoreVersion: string;
  streakDays: number;
  bestStreakDays: number;
  streakScore: number;
  reliabilityScore: number;
  anomalyScore: number;
  credibilityScore: number;
  lastActiveDay?: string | null;
  computedAt?: string | null;
  explanations?: any;
};

/** Activity summary used for consistency insights. */
export type ActivitySummary = {
  weekly: { weekKey: string; weekStart: string; activeDays: number }[];
  activeDays: number;
  topEvents: { type: string; count: number }[];
};

/** Loads consistency scores and activity summaries. */
export function useConsistency(userId?: string) {
  const { token } = useBackendAuth();
  const [score, setScore] = useState<ConsistencyScore | null>(null);
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchScore = useCallback(async () => {
    if (!userId) {
      setScore(null);
      setSummary(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/users/${userId}/consistency`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const payload = json?.data || {};
      if (payload.hidden) {
        setHidden(true);
        setScore(null);
        setSummary(null);
      } else {
        setHidden(false);
        setScore(payload.score || null);
        setSummary(payload.summary || null);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load consistency score");
      setScore(null);
      setSummary(null);
      setHidden(false);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    void fetchScore();
  }, [fetchScore]);

  return { score, summary, hidden, loading, error, refetch: fetchScore };
}
