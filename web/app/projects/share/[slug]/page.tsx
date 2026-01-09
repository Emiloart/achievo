"use client";
import { useParams } from "next/navigation";

import { getApiErrorMessage } from "../../../../lib/apiError";
import { useEffect, useMemo, useState } from "react";

const API_BASE = "/api";

type ProjectShareResponse = {
  link: {
    slug: string;
    title: string;
    description?: string | null;
    visibility: string;
    theme: string;
    sections: Record<string, boolean>;
    expiresAt?: string | null;
  };
  project: {
    name: string;
    description?: string | null;
    status: string;
    dueDate?: string | null;
    clientName?: string | null;
    clientReference?: string | null;
  };
  stats: { goalsTotal: number; goalsVerified: number; completionPercent: number };
  team?: Array<{ achusrId: string; displayName: string; username: string; avatar?: string; role: string }>;
  goals?: Array<{ goalId: string; goalCID?: string; status: string; level: number }>;
  activity?: Array<{ id: string; summary: string; createdAt: string }>;
  clientNotes?: any;
};

export default function ProjectSharePage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug || "";
  const [data, setData] = useState<ProjectShareResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchShare = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/projects/share/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setData(json.data || json);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "This project view is not available.");
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchShare();
    return () => {
      active = false;
    };
  }, [slug]);

  const themeClass = useMemo(() => {
    if (!data?.link?.theme || data.link.theme === "AUTO") return "bg-gray-50 text-gray-900";
    if (data.link.theme === "DARK") return "bg-gray-950 text-gray-100";
    return "bg-white text-gray-900";
  }, [data]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading project...</div>;
  }

  if (error || !data) {
    return <div className="text-sm text-gray-500">This project view is not available.</div>;
  }

  const sections = data.link.sections || {};
  const goals = Array.isArray(data.goals) ? data.goals : [];
  const activity = Array.isArray(data.activity) ? data.activity : [];
  const team = Array.isArray(data.team) ? data.team : [];

  return (
    <div className={`rounded-3xl border p-6 space-y-6 ${themeClass}`}>
      <div className="space-y-2">
        <div className="text-xs text-gray-500">Client View</div>
        <div className="text-2xl font-semibold">{data.project.name}</div>
        {data.project.description && <p className="text-sm text-gray-600">{data.project.description}</p>}
        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-xs">{data.project.status}</span>
          {data.project.dueDate && <span>Due {new Date(data.project.dueDate).toLocaleDateString()}</span>}
          {data.project.clientName && <span>Client: {data.project.clientName}</span>}
        </div>
      </div>

      {sections.summary && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-gray-500">Goals verified</div>
            <div className="text-lg font-semibold">
              {data.stats.goalsVerified}/{data.stats.goalsTotal}
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-gray-500">Completion</div>
            <div className="text-lg font-semibold">{data.stats.completionPercent}%</div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-xs text-gray-500">Client reference</div>
            <div className="text-lg font-semibold">{data.project.clientReference || "N/A"}</div>
          </div>
        </div>
      )}

      {sections.goals && (
        <div className="space-y-3">
          <div className="text-sm font-semibold">Goals</div>
          {goals.length ? (
            <div className="grid gap-3">
              {goals.map((goal) => (
                <div key={goal.goalId} className="rounded-xl border bg-white p-3">
                  <div className="font-semibold text-sm">{goal.goalCID || `Goal #${goal.goalId}`}</div>
                  <div className="text-xs text-gray-500">
                    Level {goal.level} ? {goal.status}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No goals to display.</div>
          )}
        </div>
      )}

      {sections.activity && (
        <div className="space-y-3">
          <div className="text-sm font-semibold">Activity</div>
          {activity.length ? (
            <div className="grid gap-3">
              {activity.map((item) => (
                <div key={item.id} className="rounded-xl border bg-white p-3">
                  <div className="text-sm font-semibold">{item.summary}</div>
                  <div className="text-xs text-gray-500">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No recent activity.</div>
          )}
        </div>
      )}

      {sections.team && (
        <div className="space-y-3">
          <div className="text-sm font-semibold">Team</div>
          {team.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {team.map((member) => (
                <div key={member.achusrId} className="rounded-xl border bg-white p-3">
                  <div className="text-sm font-semibold">{member.displayName}</div>
                  <div className="text-xs text-gray-500">
                    {member.username ? `@${member.username}` : member.achusrId}
                  </div>
                  <div className="text-xs text-gray-500">{member.role}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-500">No team members listed.</div>
          )}
        </div>
      )}

      {sections.clientNotes && data.clientNotes && (
        <div className="rounded-2xl border bg-white p-4 space-y-2">
          <div className="text-sm font-semibold">Client notes</div>
          <div className="text-sm text-gray-600">{data.clientNotes.clientReference || ""}</div>
        </div>
      )}
    </div>
  );
}
