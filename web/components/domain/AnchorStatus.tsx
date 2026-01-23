"use client";

import { StatusBadge } from "../ui";

export type AnchorState = "not_requested" | "submitted" | "pending" | "confirmed" | "unknown";

type AnchorStatusInput = {
  txHash?: string | null;
  anchoredAt?: string | null;
  submitting?: boolean;
  unknownReason?: string | null;
};

export function resolveAnchorState({ txHash, anchoredAt, submitting, unknownReason }: AnchorStatusInput): AnchorState {
  if (unknownReason) return "unknown";
  if (anchoredAt) return "confirmed";
  if (txHash) return "pending";
  if (submitting) return "submitted";
  return "not_requested";
}

const STATE_LABELS: Record<AnchorState, { tone: Parameters<typeof StatusBadge>[0]["tone"]; label: string }> = {
  not_requested: { tone: "neutral", label: "Not anchored" },
  submitted: { tone: "info", label: "Anchor submitted" },
  pending: { tone: "warning", label: "Pending confirmations" },
  confirmed: { tone: "success", label: "On-chain confirmed" },
  unknown: { tone: "warning", label: "Verification unknown" },
};

export function AnchorStatusBadge(props: AnchorStatusInput & { className?: string }) {
  const state = resolveAnchorState(props);
  const badge = STATE_LABELS[state];
  return (
    <StatusBadge tone={badge.tone} className={props.className}>
      {badge.label}
    </StatusBadge>
  );
}

export function AnchorTimeline({ txHash, anchoredAt, submitting, unknownReason }: AnchorStatusInput) {
  const state = resolveAnchorState({ txHash, anchoredAt, submitting, unknownReason });
  const steps = [
    { id: "created", label: "Created", done: true },
    { id: "submitted", label: "Submitted", done: state !== "not_requested" },
    { id: "confirmed", label: "Confirmed", done: state === "confirmed" },
  ];
  const sublabel =
    state === "unknown"
      ? "Unable to confirm right now (RPC unavailable/circuit breaker). Not a failure."
      : state === "pending"
        ? "Awaiting confirmations."
        : state === "submitted"
          ? "Queued for anchoring."
          : null;

  return (
    <div className="space-y-2 text-xs text-textMuted">
      <div className="flex flex-wrap gap-2">
        {steps.map((step) => (
          <span key={step.id} className="inline-flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${step.done ? "bg-status-verified" : "bg-border"}`} />
            <span>{step.label}</span>
          </span>
        ))}
      </div>
      {sublabel ? <div>{sublabel}</div> : null}
    </div>
  );
}
