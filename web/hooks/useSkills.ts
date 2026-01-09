/**
 * Skills hook.
 *
 * Fetches skill data and manages skill-related updates for the authenticated user.
 */
"use client";
import { useCallback, useEffect, useState } from "react";

import { getApiErrorMessage } from "../lib/apiError";
import { useBackendAuth } from "./useBackendAuth";

/** User skill record returned by the backend. */
export type UserSkillItem = {
  skillTagId: string;
  displayName: string;
  slug: string;
  proficiency?: number | null;
  endorsementsCount: number;
  endorsementsWeight: number;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
  redaction?: "NONE" | "METADATA_ONLY" | "FULL";
  unlistedPublicId?: string | null;
};

/** Loads skills for the specified user. */
export function useUserSkills(userId?: string) {
  const { token } = useBackendAuth();
  const [skills, setSkills] = useState<UserSkillItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchSkills = useCallback(async () => {
    if (!userId) {
      setSkills([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/users/${userId}/skills`, { headers, credentials: "include" });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setSkills(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load skills");
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, [userId, token]);

  useEffect(() => {
    void fetchSkills();
  }, [fetchSkills]);

  const addSkill = useCallback(
    async (skillTagId: string, proficiency?: number | null) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/users/me/skills", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ skillTagId, proficiency }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to add skill"));
      await fetchSkills();
    },
    [token, fetchSkills],
  );

  const removeSkill = useCallback(
    async (skillTagId: string) => {
      if (!token) throw new Error("Not signed in");
      const res = await fetch(`/api/users/me/skills/${skillTagId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to remove skill"));
      await fetchSkills();
    },
    [token, fetchSkills],
  );

  return { skills, loading, error, refetch: fetchSkills, addSkill, removeSkill };
}

/** Searches for skills by query string. */
export function useSkillSearch(query?: string) {
  const [results, setResults] = useState<Array<{ id: string; displayName: string; slug: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = useCallback(async () => {
    const term = (query || "").trim();
    if (!term) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/skills?query=${encodeURIComponent(term)}`);
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setResults(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to search skills");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void search();
  }, [search]);

  return { results, loading, error };
}

/** Creates or updates skills for the authenticated user. */
export function useSkillActions() {
  const { token } = useBackendAuth();

  const createSkill = useCallback(
    async (displayName: string) => {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ displayName }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, "Failed to create skill"));
      const json = await res.json();
      return json.data;
    },
    [token],
  );

  return { createSkill };
}
