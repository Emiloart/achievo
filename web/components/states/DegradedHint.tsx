"use client";

import { useDegradedMode } from "../../hooks/useDegradedMode";
import { usePolicy } from "../../hooks/usePolicy";
import { Alert } from "../ui";

type DegradedHintProps = {
  title?: string;
  className?: string;
};

/** Inline banner for pages that rely on potentially stale or degraded data sources. */
export function DegradedHint({ title = "Data may be stale", className }: DegradedHintProps) {
  const { getThreshold } = usePolicy();
  const stalenessSeconds = getThreshold("degradedStalenessSeconds");
  const { state, capabilities } = useDegradedMode(stalenessSeconds);

  if (state === "ok") return null;

  const issues: string[] = [];
  if (!capabilities.indexerReads) issues.push("Indexer data may be delayed.");
  if (!capabilities.chainReads) issues.push("On-chain reads are unavailable.");
  if (!capabilities.verifyRPC) issues.push("Verification results may be unknown.");

  const message = issues.length ? issues.join(" ") : "Some services are degraded. This view may be incomplete.";

  return (
    <Alert tone={state === "down" ? "danger" : "warning"} title={title} className={className}>
      {message}
    </Alert>
  );
}
