"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, DataTable, StatusBadge } from "../../ui";
import { EmptyState } from "../../states/EmptyState";
import { ErrorState } from "../../states/ErrorState";
import { LoadingState } from "../../states/LoadingState";
import { UI_LABELS } from "../../../lib/uiCopy";
import { setPanel } from "../../../lib/panelRouting";

export type TimeEntryItem = {
  id: string;
  goalId?: string | null;
  startedAt: string;
  endedAt?: string | null;
  durationMinutes?: number | null;
  note?: string | null;
  billable: boolean;
};

export type TimeEntryTableProps = {
  entries: TimeEntryItem[];
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  onStop: (entryId: string) => void;
  onEdit: (entry: TimeEntryItem) => void;
  onDelete: (entryId: string) => void;
  busyId?: string | null;
  busy?: boolean;
  projectSlug?: string;
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

export function TimeEntryTable({
  entries,
  loading,
  error,
  onRetry,
  onStop,
  onEdit,
  onDelete,
  busyId,
  busy,
  projectSlug,
}: TimeEntryTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const columns = useMemo(
    () => [
      {
        key: "startedAt",
        label: "Start",
        render: (row: TimeEntryItem) => (
          <span className="text-xs text-textMuted">{formatTimestamp(row.startedAt)}</span>
        ),
      },
      {
        key: "endedAt",
        label: "End",
        render: (row: TimeEntryItem) => (
          <span className="text-xs text-textMuted">{row.endedAt ? formatTimestamp(row.endedAt) : "Running"}</span>
        ),
      },
      {
        key: "duration",
        label: "Duration",
        render: (row: TimeEntryItem) => <span className="text-sm">{formatDuration(row.durationMinutes)}</span>,
      },
      {
        key: "billable",
        label: "Billable",
        render: (row: TimeEntryItem) => (
          <StatusBadge tone={row.billable ? "success" : "neutral"}>
            {row.billable ? "Billable" : "Non-billable"}
          </StatusBadge>
        ),
      },
      {
        key: "note",
        label: "Note",
        render: (row: TimeEntryItem) => <span className="text-sm">{row.note || "-"}</span>,
      },
      {
        key: "actions",
        label: "Actions",
        render: (row: TimeEntryItem) => (
          <div className="flex flex-wrap gap-2">
            {!row.endedAt ? (
              <Button size="sm" onClick={() => onStop(row.id)} disabled={busy || busyId === row.id}>
                {UI_LABELS.stop}
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={() => onEdit(row)} disabled={busy || busyId === row.id}>
              {UI_LABELS.edit}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDelete(row.id)} disabled={busy || busyId === row.id}>
              {UI_LABELS.delete}
            </Button>
          </div>
        ),
      },
    ],
    [busy, busyId, onDelete, onEdit, onStop],
  );

  if (loading) {
    return <LoadingState title="Loading time entries" description="Fetching logged time." rows={3} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={onRetry} />;
  }

  if (!entries.length) {
    return (
      <EmptyState title="No time entries" description="Start a timer or add a manual entry to track project time." />
    );
  }

  return (
    <DataTable
      columns={columns}
      rows={entries}
      onRowClick={(row) => {
        if (!projectSlug) return;
        setPanel("time-entry", { panelId: row.id, projectSlug }, { router, pathname, searchParams });
      }}
    />
  );
}
