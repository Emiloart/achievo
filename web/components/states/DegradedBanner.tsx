"use client";

import { useState } from "react";
import { useDegradedMode } from "../../hooks/useDegradedMode";
import { usePolicy } from "../../hooks/usePolicy";
import { Alert, Button, StatusBadge } from "../ui";
import { Modal } from "../ui/Modal";

function resolveTone(status: string) {
  if (status === "down") return "danger";
  if (status === "degraded") return "warning";
  if (status === "unknown") return "warning";
  return "neutral";
}

function statusLabel(status: string) {
  if (status === "down") return "Down";
  if (status === "degraded") return "Degraded";
  if (status === "unknown") return "Unknown";
  return "OK";
}

export function DegradedBanner() {
  const [open, setOpen] = useState(false);
  const { getThreshold } = usePolicy();
  const stalenessSeconds = getThreshold("degradedStalenessSeconds");
  const { state, summary, subsystems, checkedAt, capabilities } = useDegradedMode(stalenessSeconds);

  if (state === "ok") return null;

  return (
    <>
      <Alert tone={resolveTone(state)} title="Degraded mode">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>{summary}</span>
          <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
            Details
          </Button>
        </div>
      </Alert>
      <Modal open={open} onClose={() => setOpen(false)} title="System health details">
        <div className="space-y-4 text-sm">
          <div className="text-xs text-textMuted">Last checked: {checkedAt}</div>
          <div className="space-y-3">
            {subsystems.map((subsystem) => (
              <div key={subsystem.subsystem} className="rounded-2xl border border-border bg-surface2 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-semibold capitalize">{subsystem.subsystem}</div>
                  <StatusBadge tone={resolveTone(subsystem.status)}>{statusLabel(subsystem.status)}</StatusBadge>
                </div>
                {subsystem.reason ? <div className="text-xs text-textMuted mt-1">{subsystem.reason}</div> : null}
                {subsystem.details ? (
                  <pre className="mt-2 whitespace-pre-wrap text-xs text-textMuted">
                    {JSON.stringify(subsystem.details, null, 2)}
                  </pre>
                ) : null}
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-surface2 p-3">
            <div className="font-semibold">Affected capabilities</div>
            <ul className="mt-2 grid gap-1 text-xs text-textMuted">
              <li>Chain reads: {capabilities.chainReads ? "OK" : "Degraded"}</li>
              <li>Chain writes: {capabilities.chainWrites ? "OK" : "Degraded"}</li>
              <li>Indexer reads: {capabilities.indexerReads ? "OK" : "Degraded"}</li>
              <li>Anchoring: {capabilities.anchoring ? "OK" : "Degraded"}</li>
              <li>Verify RPC: {capabilities.verifyRPC ? "OK" : "Degraded"}</li>
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
}
