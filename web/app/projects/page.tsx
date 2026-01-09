"use client";
import Link from "next/link";

import { getApiErrorMessage } from "../../lib/apiError";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBackendAuth } from "../../hooks/useBackendAuth";

const API_BASE = "/api";

type ProjectSummary = {
  project: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    status: string;
    visibility: string;
    dueDate?: string | null;
    clientName?: string | null;
  };
  membership: { role: string; status: string } | null;
  stats: { goalsTotal: number; goalsVerified: number; completionPercent: number };
};

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

export default function ProjectsPage() {
  const { token } = useBackendAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const fetchProjects = useCallback(async () => {
    if (!token) {
      setProjects([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await fetch(`${API_BASE}/projects${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setProjects(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, token]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const content = useMemo(() => {
    if (!token) {
      return <div className="text-sm text-gray-500">Sign in to view your projects.</div>;
    }
    if (loading) {
      return <div className="text-sm text-gray-500">Loading projects...</div>;
    }
    if (!projects.length) {
      return <div className="text-sm text-gray-500">You have no projects yet.</div>;
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((item) => (
          <ProjectCard key={item.project.id} item={item} />
        ))}
      </div>
    );
  }, [token, loading, projects]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">Projects</h2>
          <p className="text-sm text-gray-500">Track client workspaces, goals, and progress in one place.</p>
        </div>
        <Link href="/projects/new" className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm">
          Create Project
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="text-gray-600">Status</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-md px-2 py-1 text-sm"
        >
          <option value="">All</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {content}
    </div>
  );
}

function ProjectCard({ item }: { item: ProjectSummary }) {
  const href = `/projects/${item.project.slug}` as Route;
  return (
    <div className="rounded-2xl border bg-white p-5 space-y-2 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">{item.project.name}</div>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{item.project.status}</span>
      </div>
      <div className="text-xs text-gray-500">@{item.project.slug}</div>
      {item.project.description && <div className="text-sm text-gray-600">{item.project.description}</div>}
      <div className="flex flex-wrap gap-3 text-xs text-gray-500">
        <span>
          {item.stats.goalsVerified}/{item.stats.goalsTotal} goals verified
        </span>
        <span>{item.stats.completionPercent}% complete</span>
        {item.project.dueDate && <span>Due {formatDate(item.project.dueDate)}</span>}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500">Role: {item.membership?.role || "MEMBER"}</div>
        <Link href={href} className="text-sm text-brand-600 hover:underline">
          View project
        </Link>
      </div>
    </div>
  );
}
