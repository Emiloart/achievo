/**
 * Quests hook.
 *
 * Retrieves quest data and progress for the authenticated user.
 */
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useBackendAuth } from "./useBackendAuth";

type QuestStatus = "ACTIVE" | "COMPLETED" | "CLAIMED" | "EXPIRED";

/** Quest metadata returned by the backend. */
export type QuestRow = {
  userQuestId: string | null;
  slug: string;
  title: string;
  description: string;
  type: "DAILY" | "WEEKLY" | "MILESTONE";
  triggerEvent: string;
  currentCount: number;
  targetCount: number;
  status: QuestStatus;
  xpReward: number;
};

/** Aggregate quest summary metrics. */
export type QuestSummary = {
  daily: QuestRow[];
  weekly: QuestRow[];
  milestones: QuestRow[];
  streak: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: string | null;
  };
  recentActivity: Array<{
    questSlug: string;
    title: string;
    type: string;
    xpReward: number;
    claimedAt?: string;
    completedAt?: string;
  }>;
};

const API_BASE = "/api";

const emptySummary: QuestSummary = {
  daily: [],
  weekly: [],
  milestones: [],
  streak: { currentStreak: 0, longestStreak: 0, lastActiveDate: null },
  recentActivity: [],
};

function coerceQuestArray(value: any): QuestRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((q) => ({
    userQuestId: q.userQuestId ?? null,
    slug: q.slug ?? "",
    title: q.title ?? "",
    description: q.description ?? "",
    type: q.type ?? "DAILY",
    triggerEvent: q.triggerEvent ?? "",
    currentCount: Number(q.currentCount ?? 0),
    targetCount: Number(q.targetCount ?? 0),
    status: (q.status ?? "ACTIVE") as QuestStatus,
    xpReward: Number(q.xpReward ?? 0),
  }));
}

/** Loads quests and summary data for the authenticated user. */
export function useQuests() {
  const { token } = useBackendAuth();
  const [summary, setSummary] = useState<QuestSummary>(emptySummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchQuests = useCallback(async () => {
    if (!token) {
      setSummary(emptySummary);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/quests/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const data = json?.data || json || {};
      setSummary({
        daily: coerceQuestArray(data.daily),
        weekly: coerceQuestArray(data.weekly),
        milestones: coerceQuestArray(data.milestones),
        streak: {
          currentStreak: Number(data?.streak?.currentStreak ?? 0),
          longestStreak: Number(data?.streak?.longestStreak ?? 0),
          lastActiveDate: data?.streak?.lastActiveDate ?? null,
        },
        recentActivity: Array.isArray(data?.recentActivity) ? data.recentActivity : [],
      });
    } catch (e: any) {
      setError(e?.message || "Failed to load quests");
      setSummary(emptySummary);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchQuests();
  }, [fetchQuests]);

  const claimQuest = useCallback(
    async (userQuestId: string) => {
      if (!token) {
        throw new Error("Not signed in");
      }
      if (!userQuestId) {
        throw new Error("Quest not claimable");
      }
      const res = await fetch(`${API_BASE}/quests/claim/${userQuestId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error(await getApiErrorMessage(res));
      }
      const json = await res.json();
      await fetchQuests();
      return json?.data || json;
    },
    [token, fetchQuests],
  );

  return useMemo(
    () => ({
      dailyQuests: summary.daily,
      weeklyQuests: summary.weekly,
      milestoneQuests: summary.milestones,
      streak: summary.streak,
      recentActivity: summary.recentActivity,
      loading,
      error,
      claimQuest,
      refetch: fetchQuests,
    }),
    [summary, loading, error, claimQuest, fetchQuests],
  );
}
