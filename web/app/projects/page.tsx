"use client";
import Link from "next/link";

import { getApiError } from "../../lib/apiError";
import type { Route } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { PageHeader } from "../../components/nav/PageHeader";
import { AuthRequired } from "../../components/states/AuthRequired";
import { EmptyState } from "../../components/states/EmptyState";
import { ErrorState } from "../../components/states/ErrorState";
import { LoadingState } from "../../components/states/LoadingState";
import { ButtonLink, Select, StatusPill, TableFilters } from "../../components/ui";
import { UI_LABELS } from "../../lib/uiCopy";

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
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const fetchProjects = useCallback(async () => {
    if (!token) {
      setProjects([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await fetch(`${API_BASE}/projects${query}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) {
        const { message, requestId } = await getApiError(res, "Failed to load projects.");
        const err = new Error(message);
        (err as { requestId?: string | null }).requestId = requestId;
        throw err;
      }
      const json = await res.json();
      setProjects(Array.isArray(json.data) ? json.data : []);
    } catch (e: any) {
      setError({ message: e?.message || "Failed to load projects", requestId: e?.requestId });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, token]);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  const content = useMemo(() => {
    if (!token) {
      return <AuthRequired title="Sign in to view projects" description="Connect your wallet to access projects." />;
    }
    if (loading) {
      return <LoadingState title="Loading projects" description="Fetching your workspaces and milestones." />;
    }
    if (!projects.length) {
    if (error) {
      return <ErrorState message={error.message} requestId={error.requestId} onRetry={fetchProjects} />;
    }
      return (
        <EmptyState
          title="No projects yet"
          description="Create your first project workspace to track goals and deliverables."
          primaryAction={{ label: UI_LABELS.createProject, href: "/projects/new" }}
        />
      );
    }
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {projects.map((item) => (
          <ProjectCard key={item.project.id} item={item} />
        ))}
      </div>
    );
  }, [token, loading, projects, error, fetchProjects]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Track client workspaces, goals, and progress in one place."
        actions={
          <ButtonLink href="/projects/new" variant="primary" size="sm">
            {UI_LABELS.createProject}
          </ButtonLink>
        }
      />

      <TableFilters>
        <div className="space-y-1">
          <label className="text-xs text-textMuted">Status</label>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All</option>
            <option value="ACTIVE">Active</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
      </TableFilters>

      {error && projects.length ? (
        <ErrorState message={error.message} requestId={error.requestId} onRetry={fetchProjects} />
      ) : null}
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
        <StatusPill status={item.project.status} />
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
