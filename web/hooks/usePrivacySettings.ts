/**
 * Privacy settings hook.
 *
 * Reads and updates user visibility/redaction settings through authenticated APIs.
 */
"use client";

import { getApiErrorMessage } from "../lib/apiError";
import { useCallback, useEffect, useState } from "react";
import { useBackendAuth } from "./useBackendAuth";

/** Visibility enum for profile and content surfaces. */
export type VisibilityLevel = "PUBLIC" | "UNLISTED" | "PRIVATE";
/** Redaction policy enum for profile data. */
export type RedactionMode = "NONE" | "METADATA_ONLY" | "FULL";

/** Persisted privacy settings for the authenticated user. */
export type PrivacySettings = {
  userId: string;
  defaultProfileVisibility: VisibilityLevel;
  showConsistency: boolean;
  defaultProofVisibility: VisibilityLevel;
  defaultValidationVisibility: VisibilityLevel;
  defaultAchievementVisibility: VisibilityLevel;
};

/** Per-field privacy override configuration. */
export type PrivacyOverride = {
  id: string;
  ownerUserId: string;
  contentType: string;
  contentId: string;
  visibility: VisibilityLevel;
  redaction: RedactionMode;
  unlistedPublicId?: string | null;
};

const API_BASE = "/api";

/** Loads and updates global privacy settings. */
export function usePrivacySettings() {
  const { token } = useBackendAuth();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [overridesCount, setOverridesCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSettings = useCallback(async () => {
    if (!token) {
      setSettings(null);
      setOverridesCount(0);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/privacy/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setSettings(json?.data?.settings || null);
      setOverridesCount(Number(json?.data?.overridesCount || 0));
    } catch (e: any) {
      setError(e?.message || "Failed to load privacy settings");
      setSettings(null);
      setOverridesCount(0);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  const saveSettings = useCallback(
    async (payload: Partial<PrivacySettings>) => {
      if (!token) throw new Error("Not signed in");
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/privacy/me`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        setSettings(json?.data || null);
        return json?.data as PrivacySettings;
      } catch (e: any) {
        const message = e?.message || "Failed to update privacy settings";
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  return { settings, overridesCount, loading, error, refetch: fetchSettings, saveSettings };
}

/** Loads and updates per-field privacy overrides. */
export function usePrivacyOverrides() {
  const { token } = useBackendAuth();

  const upsertOverride = useCallback(
    async (payload: {
      contentType: string;
      contentId: string;
      visibility: VisibilityLevel;
      redaction?: RedactionMode;
    }) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/privacy/override`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          contentType: payload.contentType,
          contentId: payload.contentId,
          visibility: payload.visibility,
          redaction: payload.redaction || "NONE",
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      return json?.data as PrivacyOverride;
    },
    [token],
  );

  const deleteOverride = useCallback(
    async (payload: { contentType: string; contentId: string }) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`${API_BASE}/privacy/override`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      return true;
    },
    [token],
  );

  return { upsertOverride, deleteOverride };
}
