"use client";

import { CopyField, StatusBadge } from "../../ui";
import { Drawer } from "../../ui/Modal";
import type { VerificationCheck, VerifyStatus } from "./types";

const CHECK_LABELS: Record<string, string> = {
  entity_located: "Entity located",
  hash_match: "Hash matches",
  hash_present: "Hash present",
  signature_valid: "Signature valid",
  expected_signer: "Expected signer",
  anchor_present: "Anchor present",
  anchor_verified: "Anchor verified",
};

function labelForCheck(name: string) {
  return CHECK_LABELS[name] || name.replace(/_/g, " ");
}

function toneForStatus(status: VerificationCheck["status"]) {
  if (status === "pass") return "success";
  if (status === "fail") return "danger";
  if (status === "warn") return "warning";
  return "warning";
}

type VerificationInspectorProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  status: VerifyStatus;
  idLabel: string;
  idValue: string;
  source?: string;
  timestamp?: string | null;
  requestId?: string | null;
  checks?: VerificationCheck[];
  details?: Record<string, any> | null;
};

/** Drawer view that exposes verification checks, chain context, and raw details. */
export function VerificationInspector({
  open,
  onClose,
  title,
  status,
  idLabel,
  idValue,
  source,
  timestamp,
  requestId,
  checks,
  details,
}: VerificationInspectorProps) {
  const chain = details?.chain ?? details;
  const chainId = chain?.chainId ?? null;
  const txHash = chain?.txHash ?? details?.txHash ?? null;
  const method = details?.method || details?.kind || null;

  const resolvedChecks: VerificationCheck[] = [
    { name: "entity_located", status: status === "NOT_FOUND" ? "fail" : "pass" },
    ...(checks || []),
  ];

  return (
    <Drawer open={open} onClose={onClose} title={`${title} details`}>
      <div className="space-y-4 text-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <CopyField label={idLabel} value={idValue} />
          <CopyField label="Source" value={source || "Unknown"} />
          <CopyField label="Timestamp" value={timestamp || "Unknown"} />
          {requestId ? <CopyField label="Request ID" value={requestId} /> : null}
          {chainId ? <CopyField label="Chain ID" value={String(chainId)} /> : null}
          {txHash ? <CopyField label="Transaction hash" value={txHash} /> : null}
          {method ? <CopyField label="Method" value={String(method)} /> : null}
        </div>

        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-textMuted">Verification checks</div>
          <div className="mt-2 grid gap-2">
            {resolvedChecks.map((check) => (
              <div key={`${check.name}-${check.status}`} className="flex items-center justify-between gap-3">
                <div>{labelForCheck(check.name)}</div>
                <StatusBadge tone={toneForStatus(check.status)}>
                  {check.status === "unknown" ? "Unknown" : check.status === "warn" ? "Warn" : check.status}
                </StatusBadge>
              </div>
            ))}
          </div>
        </div>

        {details ? (
          <div className="rounded-2xl border border-border bg-surface2 p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-textMuted">Raw details</div>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-textMuted">{JSON.stringify(details, null, 2)}</pre>
          </div>
        ) : null}
      </div>
    </Drawer>
  );
}
