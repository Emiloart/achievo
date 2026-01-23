"use client";

import { useMemo } from "react";
import { Button, DataTable, Input, Select, StatusPill, TableFilters } from "../../ui";
import { EmptyState } from "../../states/EmptyState";
import { LoadingState } from "../../states/LoadingState";
import { UI_LABELS } from "../../../lib/uiCopy";

export type SubmissionItem = {
  id: string;
  userId: string;
  status: string;
  note?: string | null;
  evidence?: any;
  submitter?: { displayName?: string; username?: string };
  createdAt: string;
};

export type SubmissionFilters = {
  status: string;
  programId: string;
  userId: string;
};

export type SubmissionsTableProps = {
  submissions: SubmissionItem[];
  loading: boolean;
  filters: SubmissionFilters;
  programOptions: Array<{ id: string; title: string }>;
  onFilterChange: (filters: SubmissionFilters) => void;
  onReview: (submissionId: string, status: string) => void;
  onIssueValidation?: (submission: SubmissionItem) => void;
  onRefresh?: () => void;
  busyId?: string | null;
};

function formatSubmitter(item: SubmissionItem) {
  if (item.submitter?.displayName || item.submitter?.username) {
    return `${item.submitter.displayName || item.userId} (@${item.submitter.username || item.userId})`;
  }
  return item.userId;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

export function SubmissionsTable({
  submissions,
  loading,
  filters,
  programOptions,
  onFilterChange,
  onReview,
  onIssueValidation,
  onRefresh,
  busyId,
}: SubmissionsTableProps) {
  const columns = useMemo(
    () => [
      {
        key: "submitter",
        label: "Submitter",
        render: (row: SubmissionItem) => <div className="text-sm">{formatSubmitter(row)}</div>,
      },
      {
        key: "status",
        label: "Status",
        render: (row: SubmissionItem) => <StatusPill status={row.status} />,
      },
      {
        key: "createdAt",
        label: "Submitted",
        render: (row: SubmissionItem) => <span className="text-xs text-textMuted">{formatDate(row.createdAt)}</span>,
      },
      {
        key: "actions",
        label: "Actions",
        render: (row: SubmissionItem) => (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => onReview(row.id, "APPROVED")} disabled={busyId === row.id}>
              {UI_LABELS.approve}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onReview(row.id, "REJECTED")}
              disabled={busyId === row.id}
            >
              {UI_LABELS.reject}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onReview(row.id, "REVISION_REQUESTED")}
              disabled={busyId === row.id}
            >
              {UI_LABELS.requestRevision}
            </Button>
            {onIssueValidation ? (
              <Button size="sm" variant="ghost" onClick={() => onIssueValidation(row)} disabled={busyId === row.id}>
                Issue validation
              </Button>
            ) : null}
          </div>
        ),
      },
    ],
    [busyId, onIssueValidation, onReview],
  );

  return (
    <div className="space-y-4">
      <TableFilters>
        <Select value={filters.status} onChange={(event) => onFilterChange({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="REVISION_REQUESTED">Revision requested</option>
        </Select>
        <Select
          value={filters.programId}
          onChange={(event) => onFilterChange({ ...filters, programId: event.target.value })}
        >
          <option value="">All programs</option>
          {programOptions.map((program) => (
            <option key={program.id} value={program.id}>
              {program.title}
            </option>
          ))}
        </Select>
        <Input
          value={filters.userId}
          onChange={(event) => onFilterChange({ ...filters, userId: event.target.value })}
          placeholder="Filter by user"
        />
      </TableFilters>

      {loading ? (
        <LoadingState title="Loading submissions" description="Fetching program submissions." rows={3} />
      ) : submissions.length ? (
        <DataTable columns={columns} rows={submissions} />
      ) : (
        <EmptyState
          title="No submissions"
          description="Submissions will appear here once applicants submit evidence."
          primaryAction={onRefresh ? { label: UI_LABELS.refresh, onClick: onRefresh } : undefined}
        />
      )}
    </div>
  );
}
