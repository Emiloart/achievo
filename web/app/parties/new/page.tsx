"use client";
import { useState } from "react";

import { getApiErrorMessage } from "../../../lib/apiError";
import { useRouter } from "next/navigation";
import { useBackendAuth } from "../../../hooks/useBackendAuth";

const VISIBILITY = ["PUBLIC", "INVITE_ONLY", "PRIVATE"] as const;

export default function CreatePartyPage() {
  const router = useRouter();
  const { token } = useBackendAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<(typeof VISIBILITY)[number]>("PUBLIC");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Sign in to create a party");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/parties", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name, slug, description, visibility }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const nextSlug = json?.data?.slug || slug;
      router.push(`/parties/${nextSlug}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create party");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Create a Party</h2>
        <p className="text-sm text-gray-500">Start a crew to share goals and wins together.</p>
      </div>
      <form onSubmit={handleSubmit} className="rounded-3xl border bg-white p-6 space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-semibold">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Deep Work Syndicate"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Slug</label>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="deep-work-syndicate"
          />
          <div className="text-xs text-gray-500">Lowercase letters, numbers, and hyphens only.</div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            rows={4}
            placeholder="Tightly focused builders grinding toward long-term goals."
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold">Visibility</label>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as (typeof VISIBILITY)[number])}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {VISIBILITY.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm">
          {loading ? "Creating..." : "Create party"}
        </button>
      </form>
    </div>
  );
}
