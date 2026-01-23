/**
 * Proofs hook.
 *
 * Manages proof submission and retrieval with optional anchoring flags.
 */
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useBackendAuth } from "./useBackendAuth";
import { asyncConfirmed, asyncFailed, asyncIdle, asyncLoading, type AsyncState } from "../types/asyncState";

/** Proof record returned by the backend. */
export type ProofArtifact = {
  id: string;
  userId: string;
  achievementId?: string | null;
  badgeTokenId?: string | null;
  kind: "FILE" | "URL" | "TEXT";
  title?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  storageProvider?: string | null;
  storageKey?: string | null;
  sha256: string;
  contentHash: string;
  chainId?: number | null;
  anchorTxHash?: string | null;
  anchorContract?: string | null;
  anchoredAt?: string | null;
  createdAt?: string | null;
  fileUrl?: string | null;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  redaction?: "NONE" | "METADATA_ONLY" | "FULL";
  unlistedPublicId?: string | null;
};

const API_BASE = "/api";

/** Loads proof records with optional filters. */
export function useProofs(params: { userId?: string; achievementId?: string; badgeTokenId?: string; kind?: string }) {
  const { token } = useBackendAuth();
  const [proofs, setProofs] = useState<ProofArtifact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchProofs = useCallback(async () => {
    if (!params.userId) {
      setProofs([]);
      return;
    }
    const search = new URLSearchParams();
    if (params.achievementId) search.set("achievementId", params.achievementId);
    if (params.badgeTokenId) search.set("badgeTokenId", params.badgeTokenId);
    if (params.kind) search.set("kind", params.kind);
    setLoading(true);
    setError("");
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/users/${params.userId}/proofs?${search.toString()}`, {
        headers,
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];
      setProofs(data);
    } catch (e: any) {
      setError(e?.message || "Failed to load proofs");
      setProofs([]);
    } finally {
      setLoading(false);
    }
  }, [params.userId, params.achievementId, params.badgeTokenId, params.kind, token]);

  useEffect(() => {
    void fetchProofs();
  }, [fetchProofs]);

  const uploadFile = useCallback(
    async (payload: {
      file: File;
      title?: string;
      description?: string;
      achievementId?: string;
      badgeTokenId?: string;
    }) => {
      if (!token) throw new Error("Not signed in");
      const form = new FormData();
      form.append("file", payload.file);
      if (payload.title) form.append("title", payload.title);
      if (payload.description) form.append("description", payload.description);
      if (payload.achievementId) form.append("achievementId", payload.achievementId);
      if (payload.badgeTokenId) form.append("badgeTokenId", payload.badgeTokenId);
      const res = await fetch(`${API_BASE}/proofs/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
        body: form,
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Upload failed"));
      await fetchProofs();
      return res.json();
    },
    [token, fetchProofs],
  );

  const addUrlProof = useCallback(
    async (payload: {
      sourceUrl: string;
      title?: string;
      description?: string;
      achievementId?: string;
      badgeTokenId?: string;
    }) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/proofs/url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to add proof"));
      await fetchProofs();
      return res.json();
    },
    [token, fetchProofs],
  );

  const anchorProof = useCallback(
    async (id: string) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/proofs/${id}/anchor`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to anchor proof"));
      await fetchProofs();
      return res.json();
    },
    [token, fetchProofs],
  );

  const state: AsyncState<ProofArtifact[]> = useMemo(() => {
    if (!params.userId) return asyncIdle<ProofArtifact[]>([]);
    if (loading) return asyncLoading<ProofArtifact[]>(proofs);
    if (error) return asyncFailed<ProofArtifact[]>(error, proofs);
    return asyncConfirmed<ProofArtifact[]>(proofs);
  }, [error, loading, params.userId, proofs]);

  return { proofs, loading, error, state, refetch: fetchProofs, uploadFile, addUrlProof, anchorProof };
}
