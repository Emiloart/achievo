/**
 * Endorsements hook.
 *
 * Loads endorsements and submits new endorsements for the authenticated user.
 */
"use client";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useBackendAuth } from "./useBackendAuth";

/** Endorsement record returned by the backend. */
export type EndorsementItem = {
  id: string;
  endorserUserId: string;
  targetUserId: string;
  targetType: string;
  targetId?: string | null;
  message?: string | null;
  status: string;
  computedWeight: number;
  createdAt?: string | null;
  endorser?: { userId: string; displayName?: string; username?: string };
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  redaction?: "NONE" | "METADATA_ONLY" | "FULL";
  unlistedPublicId?: string | null;
};

/** Aggregated endorsement counts by status and category. */
export type EndorsementAggregates = {
  countActive: number;
  totalWeight: number;
  byTargetType?: Array<{ targetType: string; count: number; totalWeight: number }>;
};

/** Loads endorsement lists for a target user or entity. */
export function useEndorsements(userId?: string, filters?: { targetType?: string; targetId?: string }) {
  const { token } = useBackendAuth();
  const [items, setItems] = useState<EndorsementItem[]>([]);
  const [aggregates, setAggregates] = useState<EndorsementAggregates | null>(null);
  const [decision, setDecision] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchEndorsements = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setAggregates(null);
      return;
    }
    const search = new URLSearchParams();
    if (filters?.targetType) search.set("targetType", filters.targetType);
    if (filters?.targetId) search.set("targetId", filters.targetId);
    setLoading(true);
    setError("");
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/users/${userId}/endorsements?${search.toString()}`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setItems(Array.isArray(json.data) ? json.data : []);
      setAggregates(json.aggregates || null);
      setDecision(json.decision || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load endorsements");
      setItems([]);
      setAggregates(null);
      setDecision(null);
    } finally {
      setLoading(false);
    }
  }, [userId, filters?.targetType, filters?.targetId, token]);

  useEffect(() => {
    void fetchEndorsements();
  }, [fetchEndorsements]);

  return { items, aggregates, decision, loading, error, refetch: fetchEndorsements };
}

/** Loads endorsement aggregate metrics for a user. */
export function useEndorsementSummary(userId?: string) {
  const { token } = useBackendAuth();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSummary = useCallback(async () => {
    if (!userId) {
      setSummary(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/users/${userId}/endorsements/summary`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setSummary(json.data || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load endorsement summary");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}

/** Creates endorsements for the authenticated user. */
export function useEndorsementActions() {
  const { token } = useBackendAuth();

  const createEndorsement = useCallback(
    async (payload: any) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/endorsements", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to create endorsement"));
      return res.json();
    },
    [token],
  );

  const revokeEndorsement = useCallback(
    async (endorsementId: string) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`/api/endorsements/${endorsementId}/revoke`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to revoke endorsement"));
      return res.json();
    },
    [token],
  );

  return { createEndorsement, revokeEndorsement };
}
