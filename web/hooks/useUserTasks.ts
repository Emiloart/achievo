/**
 * User tasks hook.
 *
 * Loads and updates task state for the authenticated user.
 */
"use client";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useAccount } from "wagmi";
import { useBackendAuth } from "./useBackendAuth";

/** Supported goal status values returned by the backend. */
export type GoalStatus = "DRAFT" | "SUBMITTED" | "PENDING_PEER" | "VERIFIED" | "BADGED" | "LEGACY_IMPORTED";

/** Goal record with computed status used by the UI. */
export type GoalWithStatus = {
  id: number;
  creator: string;
  goalCID: string;
  evidenceCID: string;
  level: number;
  approvals: number;
  createdAt: number;
  verified: boolean;
  badgeMinted: boolean;
  peersRestricted: boolean;
  autoVerifier: string;
  autoDataHash: string;
  autoVerifiedAt: number;
  legacyId: string;
  legacyTxHash: string;
  status: GoalStatus;
  isMigrated: boolean;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  redaction?: "NONE" | "METADATA_ONLY" | "FULL";
  unlistedPublicId?: string | null;
};

const API_BASE = "/api";

/** Loads task/goal data for the authenticated user or an override address. */
export function useUserTasks(addressOverride?: string) {
  const { address } = useAccount();
  const { token } = useBackendAuth();
  const [tasks, setTasks] = useState<GoalWithStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const fetchTasks = useCallback(async () => {
    const target = addressOverride || address;
    if (!target) {
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/achievo/tasks/${target}`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      const mapped: GoalWithStatus[] = data
        .map((g: any) => ({
          ...g,
          id: Number(g.id ?? 0),
          level: Number(g.level ?? 0),
          approvals: Number(g.approvals ?? 0),
          createdAt: Number(g.createdAt ?? 0),
          status: (g.status as GoalStatus) ?? "DRAFT",
          isMigrated: Boolean(g.isMigrated),
        }))
        .sort((a: GoalWithStatus, b: GoalWithStatus) => b.createdAt - a.createdAt || b.id - a.id);
      setTasks(mapped);
    } catch (e: any) {
      setError(e?.message || "Failed to load goals");
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [address, addressOverride, token]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refetch: fetchTasks };
}
