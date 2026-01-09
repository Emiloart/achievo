/**
 * Profile highlight pinning hook.
 *
 * Controls the ordered set of pinned highlights for the authenticated user.
 */
"use client";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useBackendAuth } from "./useBackendAuth";
import type { HighlightItem } from "./useProfessionalProfile";

const API_BASE = "/api";

/** Loads and updates the user's pinned highlights. */
export function useProfilePins() {
  const { token } = useBackendAuth();
  const [pins, setPins] = useState<HighlightItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchPins = useCallback(async () => {
    if (!token) {
      setPins([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/profile/pins/me`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setPins(Array.isArray(json.pins) ? json.pins : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load highlights");
      setPins([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchPins();
  }, [fetchPins]);

  const savePins = useCallback(
    async (nextPins: Array<{ type: string; ref: string }>) => {
      if (!token) throw new Error("Not signed in");
      setSaving(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/profile/pins/me`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ pins: nextPins }),
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        setPins(Array.isArray(json.pins) ? json.pins : []);
      } catch (e: any) {
        setError(e?.message || "Failed to save highlights");
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [token],
  );

  return { pins, loading, saving, error, refetch: fetchPins, savePins, setPins };
}
