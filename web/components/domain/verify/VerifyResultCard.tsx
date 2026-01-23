"use client";

import { useState } from "react";
import { Badge, Button, Card, CardBody, CopyField } from "../../ui";
import { VerificationInspector } from "./VerificationInspector";
import type { VerificationCheck, VerifyStatus } from "./types";

export type VerifyMetaItem = {
  label: string;
  value?: string | null;
};

export type VerifyResultCardProps = {
  status: VerifyStatus;
  title: string;
  idLabel: string;
  idValue: string;
  source?: string;
  timestamp?: string | null;
  reason?: string;
  requestId?: string | null;
  meta?: VerifyMetaItem[];
  checks?: VerificationCheck[];
  details?: Record<string, any> | null;
};

const STATUS_STYLES: Record<VerifyStatus, { variant: Parameters<typeof Badge>[0]["variant"]; label: string }> = {
  VERIFIED: { variant: "verified", label: "On-chain confirmed" },
  NOT_FOUND: { variant: "neutral", label: "Not found" },
  INVALID: { variant: "danger", label: "Verification failed" },
  UNKNOWN: { variant: "warning", label: "Verification unknown" },
  ERROR: { variant: "danger", label: "Error" },
};

export function VerifyResultCard({
  status,
  title,
  idLabel,
  idValue,
  source,
  timestamp,
  reason,
  requestId,
  meta,
  checks,
  details,
}: VerifyResultCardProps) {
  const [open, setOpen] = useState(false);
  const resolvedStatus = status === "UNKNOWN" ? "UNKNOWN" : status;
  const badge = STATUS_STYLES[resolvedStatus] || STATUS_STYLES.ERROR;
  const resolvedReason =
    resolvedStatus === "UNKNOWN" && !reason
      ? "Unable to confirm right now (RPC unavailable/circuit breaker). Not a failure."
      : reason;

  if (process.env.NODE_ENV !== "production") {
    if (resolvedStatus === "UNKNOWN" && badge.label === "Verified") {
      // eslint-disable-next-line no-console
      console.error("VerifyResultCard invariant violated: UNKNOWN status cannot render as VERIFIED.");
    }
  }

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold">{title}</div>
          <div className="flex items-center gap-2">
            <Badge variant={badge.variant}>{badge.label}</Badge>
            <Button variant="ghost" size="sm" type="button" onClick={() => setOpen(true)}>
              View details
            </Button>
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <CopyField label={idLabel} value={idValue} />
          <CopyField label="Source" value={source || "Unknown"} />
          <CopyField label="Timestamp" value={timestamp || "Unknown"} />
          {requestId ? <CopyField label="Request ID" value={requestId} /> : null}
        </div>
        {resolvedReason ? <div className="text-xs text-textMuted">{resolvedReason}</div> : null}
        {meta?.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {meta.map((item) =>
              item.value ? (
                <CopyField key={`${item.label}-${item.value}`} label={item.label} value={item.value} />
              ) : null,
            )}
          </div>
        ) : null}
      </CardBody>
      <VerificationInspector
        open={open}
        onClose={() => setOpen(false)}
        title={title}
        status={resolvedStatus}
        idLabel={idLabel}
        idValue={idValue}
        source={source}
        timestamp={timestamp}
        requestId={requestId}
        checks={checks}
        details={details}
      />
    </Card>
  );
}
