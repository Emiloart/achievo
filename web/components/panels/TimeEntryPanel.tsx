"use client";

import { useEffect, useMemo, useState } from "react";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { getApiErrorMessage } from "../../lib/apiError";
import { DegradedHint } from "../states/DegradedHint";
import { ErrorState } from "../states/ErrorState";
import { LoadingState } from "../states/LoadingState";
import { Card, CardBody, StatusBadge } from "../ui";
import { AuthRequired } from "../states/AuthRequired";

type TimeEntryPanelProps = {
  entryId: string;
  projectSlug: string;
};

type TimeEntryItem = {
  id: string;
  goalId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  note?: string | null;
  billable: boolean;
};

function formatTimestamp(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function formatDuration(totalMinutes?: number | null) {
  if (!totalMinutes) return "0m";
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (!hours) return `${mins}m`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export function TimeEntryPanel({ entryId, projectSlug }: TimeEntryPanelProps) {
  const { token } = useBackendAuth();
  const [entry, setEntry] = useState<TimeEntryItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectSlug || !token) {
      setEntry(null);
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${projectSlug}/time-entries`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        const data = json.data || {};
        const entries = Array.isArray(data.entries) ? (data.entries as TimeEntryItem[]) : [];
        const match = entries.find((item) => item.id === entryId) || null;
        if (active) setEntry(match);
      } catch (e: any) {
        if (active) setError(e?.message || "Unable to load time entry.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [entryId, projectSlug, token]);

  const duration = useMemo(() => formatDuration(entry?.durationMinutes), [entry?.durationMinutes]);

  if (!token) {
    return <AuthRequired title="Project access" description="Sign in to view time entries." />;
  }

  if (loading) {
    return <LoadingState title="Loading time entry" description="Fetching time entry details." rows={2} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!entry) {
    return <ErrorState message="Time entry not found." />;
  }

  return (
    <div className="space-y-4">
      <DegradedHint />
      <Card>
        <CardBody className="space-y-3">
          <div className="flex items-center gap-2">
            <StatusBadge tone={entry.billable ? "success" : "neutral"}>
              {entry.billable ? "Billable" : "Non-billable"}
            </StatusBadge>
            <span className="text-xs text-textMuted">{duration}</span>
          </div>
          <div className="text-sm">
            <div className="text-xs text-textMuted">Started</div>
            <div>{formatTimestamp(entry.startedAt)}</div>
          </div>
          <div className="text-sm">
            <div className="text-xs text-textMuted">Ended</div>
            <div>{entry.endedAt ? formatTimestamp(entry.endedAt) : "Running"}</div>
          </div>
          {entry.note ? (
            <div className="text-sm">
              <div className="text-xs text-textMuted">Note</div>
              <div>{entry.note}</div>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
