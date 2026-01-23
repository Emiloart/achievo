"use client";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "../../../lib/apiError";
import { useRouter } from "next/navigation";
import { useBackendAuth } from "../../../hooks/useBackendAuth";

const API_BASE = "/api";

type PartyOption = { id: string; slug: string; name: string };

export default function NewProjectPage() {
  const router = useRouter();
  const { token } = useBackendAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("PRIVATE");
  const [status, setStatus] = useState("ACTIVE");
  const [clientName, setClientName] = useState("");
  const [clientReference, setClientReference] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [linkedPartyId, setLinkedPartyId] = useState("");
  const [parties, setParties] = useState<PartyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const fetchParties = async () => {
      if (!token) {
        setParties([]);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}/parties/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        const data = Array.isArray(json.data) ? json.data : [];
        if (!active) return;
        setParties(data.map((p: any) => ({ id: p.id, slug: p.slug, name: p.name })));
      } catch {
        if (active) setParties([]);
      }
    };
    void fetchParties();
    return () => {
      active = false;
    };
  }, [token]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError("Sign in to create a project");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload: any = {
        name,
        slug,
        description,
        visibility,
        status,
        clientName: clientName || null,
        clientReference: clientReference || null,
        linkedPartyId: linkedPartyId || null,
      };
      if (dueDate) {
        const date = new Date(dueDate);
        payload.dueDate = Number.isNaN(date.getTime()) ? null : date.toISOString();
      }
      const res = await fetch(`${API_BASE}/projects`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const projectSlug = json?.data?.slug || slug;
      router.push(`/projects/${projectSlug}`);
    } catch (e: any) {
      setError(e?.message || "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Create Project</h2>
        <p className="text-sm text-gray-500">Set up a new workspace and invite collaborators.</p>
      </div>

      {error && <div className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger">{error}</div>}

      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Slug</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm text-gray-600">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
            rows={3}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Visibility</label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="PRIVATE">Private</option>
              <option value="INVITE_ONLY">Invite only</option>
              <option value="PUBLIC">Public</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Client name</label>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Client reference</label>
            <input
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Linked party</label>
            <select
              value={linkedPartyId}
              onChange={(e) => setLinkedPartyId(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
            >
              <option value="">None</option>
              {parties.map((party) => (
                <option key={party.id} value={party.id}>
                  {party.name} (@{party.slug})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm">
          {loading ? "Creating..." : "Create Project"}
        </button>
      </form>
    </div>
  );
}
