"use client";

import { usePolicy } from "../../hooks/usePolicy";
import { StatusBadge } from "../ui";
import type { TxState } from "./TxTypes";

type ChainActionStatus = "PENDING" | "CONFIRMED" | "FAILED" | "DROPPED_REORG";

export type FinalityTimelineProps = {
  txHash?: `0x${string}` | string | null;
  chainId?: number | null;
  state: TxState;
  confirmations?: number | null;
  targetFinality?: number | null;
  chainActionStatus?: ChainActionStatus | null;
};

type Step = {
  id: string;
  label: string;
  status: "done" | "current" | "upcoming" | "failed" | "unknown";
  helper?: string;
};

function normalizeState(state: TxState, chainActionStatus?: ChainActionStatus | null, txHash?: string | null): TxState {
  if (!chainActionStatus) return state;
  if (chainActionStatus === "CONFIRMED") return "finalized";
  if (chainActionStatus === "FAILED") return "failed";
  if (chainActionStatus === "DROPPED_REORG") return "reorged";
  if (chainActionStatus === "PENDING") return txHash ? "confirming" : "submitted";
  return state;
}

function toneForStep(status: Step["status"]) {
  if (status === "done") return "success";
  if (status === "current") return "info";
  if (status === "failed") return "danger";
  if (status === "unknown") return "warning";
  return "neutral";
}

function buildSteps(
  state: TxState,
  txHash?: string | null,
  confirmations?: number | null,
  targetFinality?: number | null,
) {
  const confirmationLabel =
    confirmations && targetFinality
      ? `Confirming (${confirmations}/${targetFinality})`
      : confirmations
        ? `Confirming (${confirmations})`
        : "Confirming";

  if (state === "failed") {
    return [
      { id: "created", label: "Created", status: "done" },
      { id: "submitted", label: txHash ? "Submitted" : "Submitted (hash pending)", status: "done" },
      { id: "confirming", label: confirmationLabel, status: "failed", helper: "Transaction reverted or failed." },
      { id: "finalized", label: "Finalized", status: "failed" },
    ] satisfies Step[];
  }

  if (state === "reorged") {
    return [
      { id: "created", label: "Created", status: "done" },
      { id: "submitted", label: txHash ? "Submitted" : "Submitted (hash pending)", status: "done" },
      { id: "confirming", label: confirmationLabel, status: "done" },
      { id: "finalized", label: "Reorg detected", status: "unknown", helper: "Awaiting resync." },
    ] satisfies Step[];
  }

  if (state === "unknown") {
    return [
      { id: "created", label: "Created", status: "done" },
      { id: "submitted", label: txHash ? "Submitted" : "Submitted (hash pending)", status: "current" },
      { id: "confirming", label: confirmationLabel, status: "unknown", helper: "Unable to confirm right now." },
      { id: "finalized", label: "Finalized", status: "upcoming" },
    ] satisfies Step[];
  }

  if (state === "finalized") {
    return [
      { id: "created", label: "Created", status: "done" },
      { id: "submitted", label: "Submitted", status: "done" },
      { id: "confirming", label: confirmationLabel, status: "done" },
      { id: "finalized", label: "Finalized", status: "done" },
    ] satisfies Step[];
  }

  if (state === "confirming") {
    return [
      { id: "created", label: "Created", status: "done" },
      { id: "submitted", label: "Submitted", status: "done" },
      { id: "confirming", label: confirmationLabel, status: "current" },
      { id: "finalized", label: "Finalized", status: "upcoming" },
    ] satisfies Step[];
  }

  if (state === "submitted") {
    return [
      { id: "created", label: "Created", status: "done" },
      { id: "submitted", label: txHash ? "Submitted" : "Submitted (hash pending)", status: "current" },
      { id: "confirming", label: confirmationLabel, status: "upcoming" },
      { id: "finalized", label: "Finalized", status: "upcoming" },
    ] satisfies Step[];
  }

  if (state === "walletPrompt") {
    return [
      { id: "created", label: "Created", status: "current", helper: "Awaiting wallet signature." },
      { id: "submitted", label: "Submitted", status: "upcoming" },
      { id: "confirming", label: confirmationLabel, status: "upcoming" },
      { id: "finalized", label: "Finalized", status: "upcoming" },
    ] satisfies Step[];
  }

  return [
    { id: "created", label: "Created", status: "current" },
    { id: "submitted", label: "Submitted", status: "upcoming" },
    { id: "confirming", label: confirmationLabel, status: "upcoming" },
    { id: "finalized", label: "Finalized", status: "upcoming" },
  ] satisfies Step[];
}

/** Renders a deterministic confirmation timeline for on-chain actions. */
export function FinalityTimeline({
  txHash,
  chainId,
  state,
  confirmations,
  targetFinality,
  chainActionStatus,
}: FinalityTimelineProps) {
  const { getThreshold } = usePolicy();
  const resolvedTarget = targetFinality ?? getThreshold("finalityConfirmations");
  const resolvedState = normalizeState(state, chainActionStatus || undefined, txHash || undefined);
  const steps = buildSteps(resolvedState, txHash || undefined, confirmations, resolvedTarget);

  if (process.env.NODE_ENV !== "production" && resolvedState === "finalized" && !txHash) {
    // eslint-disable-next-line no-console
    console.error("FinalityTimeline invariant violated: finalized state requires a transaction hash.");
  }

  return (
    <div className="rounded-2xl border border-border bg-surface2 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">Finality timeline</div>
        {txHash ? (
          <StatusBadge tone="info">
            {txHash.slice(0, 10)}...{txHash.slice(-6)}
          </StatusBadge>
        ) : null}
      </div>
      {chainId ? <div className="mt-1 text-xs text-textMuted">Chain ID: {chainId}</div> : null}
      <div className="mt-3 grid gap-2">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <StatusBadge tone={toneForStep(step.status)}>{step.label}</StatusBadge>
              {step.helper ? <span className="text-xs text-textMuted">{step.helper}</span> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
