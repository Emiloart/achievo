/**
 * Share links hook.
 *
 * Creates and lists shareable profile links for the authenticated user.
 */
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useBackendAuth } from "./useBackendAuth";
import { asyncConfirmed, asyncFailed, asyncIdle, asyncLoading, type AsyncState } from "../types/asyncState";

/** Share link record returned by the backend. */
export type ShareLink = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  visibility: string;
  theme: string;
  sections: Record<string, boolean>;
  isPrimary: boolean;
  expiresAt?: string | null;
  createdAt?: string;
};

const API_BASE = "/api";

/** Loads and manages share links for the authenticated user. */
export function useShareLinks() {
  const { token } = useBackendAuth();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchLinks = useCallback(async () => {
    if (!token) {
      setLinks([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/profile/share-links/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setLinks(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load share links");
      setLinks([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchLinks();
  }, [fetchLinks]);

  const createLink = useCallback(
    async (payload: Record<string, unknown>) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/profile/share-links`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setLinks((prev) => [json.data, ...prev]);
      return json.data as ShareLink;
    },
    [token],
  );

  const updateLink = useCallback(
    async (id: string, payload: Record<string, unknown>) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/profile/share-links/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setLinks((prev) => prev.map((link) => (link.id === id ? json.data : link)));
      return json.data as ShareLink;
    },
    [token],
  );

  const deleteLink = useCallback(
    async (id: string) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/profile/share-links/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      setLinks((prev) => prev.filter((link) => link.id !== id));
      return true;
    },
    [token],
  );

  const state: AsyncState<ShareLink[]> = useMemo(() => {
    if (!token) return asyncIdle<ShareLink[]>([]);
    if (loading) return asyncLoading<ShareLink[]>(links);
    if (error) return asyncFailed<ShareLink[]>(error, links);
    return asyncConfirmed<ShareLink[]>(links);
  }, [error, links, loading, token]);

  return { links, loading, error, state, refetch: fetchLinks, createLink, updateLink, deleteLink };
}
