"use client";

import { useEffect, useMemo, useState } from "react";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { getApiErrorMessage } from "../../lib/apiError";
import { Card, CardBody, StatusPill, CopyField } from "../ui";
import { DegradedHint } from "../states/DegradedHint";
import { ErrorState } from "../states/ErrorState";
import { LoadingState } from "../states/LoadingState";
import { AuthRequired } from "../states/AuthRequired";

type SubmissionPanelProps = {
  submissionId: string;
  orgId: string;
};

type SubmissionItem = {
  id: string;
  userId: string;
  status: string;
  note?: string | null;
  evidence?: any;
  submitter?: { displayName?: string; username?: string };
  createdAt: string;
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
}

function formatSubmitter(item: SubmissionItem) {
  if (item.submitter?.displayName || item.submitter?.username) {
    return `${item.submitter.displayName || item.userId} (@${item.submitter.username || item.userId})`;
  }
  return item.userId;
}

function normalizeEvidence(evidence: any) {
  if (!evidence) return [];
  if (Array.isArray(evidence)) return evidence;
  return [evidence];
}

export function SubmissionPanel({ submissionId, orgId }: SubmissionPanelProps) {
  const { token } = useBackendAuth();
  const [submission, setSubmission] = useState<SubmissionItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !token) {
      setSubmission(null);
      return;
    }
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/orgs/${orgId}/submissions`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        const items = Array.isArray(json.data) ? (json.data as SubmissionItem[]) : [];
        const match = items.find((item) => item.id === submissionId) || null;
        if (active) setSubmission(match);
      } catch (e: any) {
        if (active) setError(e?.message || "Unable to load submission.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [orgId, submissionId, token]);

  const evidence = useMemo(() => normalizeEvidence(submission?.evidence), [submission?.evidence]);

  if (!token) {
    return <AuthRequired title="Admin access" description="Sign in to view submission details." />;
  }

  if (loading) {
    return <LoadingState title="Loading submission" description="Fetching submission details." rows={2} />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!submission) {
    return <ErrorState message="Submission not found." />;
  }

  return (
    <div className="space-y-4">
      <DegradedHint />
      <Card>
        <CardBody className="space-y-3">
          <div>
            <div className="text-xs text-textMuted">Submitter</div>
            <div className="text-sm font-semibold">{formatSubmitter(submission)}</div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill status={submission.status} />
            <span className="text-xs text-textMuted">{formatDate(submission.createdAt)}</span>
          </div>
          <CopyField label="Submission ID" value={submission.id} />
          {submission.note ? (
            <div className="text-sm">
              <div className="text-xs text-textMuted">Note</div>
              <div>{submission.note}</div>
            </div>
          ) : null}
          {evidence.length ? (
            <div className="space-y-2 text-sm">
              <div className="text-xs text-textMuted">Evidence</div>
              <ul className="space-y-1 list-disc list-inside">
                {evidence.map((item) => (
                  <li key={String(item)} className="break-all">
                    {String(item)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}
