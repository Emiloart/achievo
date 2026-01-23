export type HealthStatus = "OK" | "DEGRADED" | "DOWN" | "UNKNOWN";
export type DegradedState = "ok" | "degraded" | "down" | "unknown";
export type HealthSubsystem = "chain" | "indexer" | "anchoring";

export type HealthSnapshot = {
  subsystem: HealthSubsystem;
  status: DegradedState;
  checkedAt: string;
  reason?: string | null;
  details?: Record<string, unknown> | null;
};

export type DegradedCapabilities = {
  chainReads: boolean;
  chainWrites: boolean;
  indexerReads: boolean;
  anchoring: boolean;
  verifyRPC: boolean;
};

type HealthResponse = {
  status?: "OK" | "DEGRADED" | "DOWN";
  checks?: Array<{ name: string; status: "OK" | "DEGRADED" | "DOWN"; details?: any }>;
  time?: string;
};

function toDegradedState(status?: string | null): DegradedState {
  if (!status) return "unknown";
  if (status === "OK") return "ok";
  if (status === "DEGRADED") return "degraded";
  if (status === "DOWN") return "down";
  return "unknown";
}

function nowIso() {
  return new Date().toISOString();
}

function mapChecks(checks?: HealthResponse["checks"]) {
  if (!checks?.length) return null;
  return checks.reduce<Record<string, unknown>>((acc, check) => {
    acc[check.name] = check.details ?? true;
    return acc;
  }, {});
}

async function fetchHealth(path: string, subsystem: HealthSubsystem): Promise<HealthSnapshot> {
  try {
    const res = await fetch(`/api${path}`, { cache: "no-store", credentials: "include" });
    if (!res.ok) {
      return {
        subsystem,
        status: "unknown",
        checkedAt: nowIso(),
        reason: `HTTP_${res.status}`,
      };
    }
    const data = (await res.json()) as HealthResponse;
    return {
      subsystem,
      status: toDegradedState(data.status || "UNKNOWN"),
      checkedAt: data.time || nowIso(),
      details: mapChecks(data.checks),
    };
  } catch (error) {
    return {
      subsystem,
      status: "unknown",
      checkedAt: nowIso(),
      reason: (error as Error)?.message || "NETWORK_ERROR",
    };
  }
}

export async function fetchHealthSnapshot() {
  const [chain, indexer, anchoring] = await Promise.all([
    fetchHealth("/health/chain", "chain"),
    fetchHealth("/health/indexer", "indexer"),
    fetchHealth("/health/anchoring", "anchoring"),
  ]);
  return [chain, indexer, anchoring];
}

export function deriveCapabilities(snapshots: HealthSnapshot[]): DegradedCapabilities {
  const chainStatus = snapshots.find((item) => item.subsystem === "chain")?.status || "unknown";
  const indexerStatus = snapshots.find((item) => item.subsystem === "indexer")?.status || "unknown";
  const anchoringStatus = snapshots.find((item) => item.subsystem === "anchoring")?.status || "unknown";

  return {
    chainReads: chainStatus === "ok",
    chainWrites: chainStatus === "ok",
    verifyRPC: chainStatus === "ok",
    indexerReads: indexerStatus === "ok",
    anchoring: anchoringStatus === "ok",
  };
}

export function summarizeHealth(snapshots: HealthSnapshot[]) {
  const stateRank: Record<DegradedState, number> = { ok: 0, unknown: 1, degraded: 2, down: 3 };
  const ordered = [...snapshots].sort((a, b) => stateRank[b.status] - stateRank[a.status]);
  const overall = ordered[0]?.status || "unknown";

  const summary =
    overall === "down"
      ? "Some services are unavailable. Actions may fail and data may be stale."
      : overall === "degraded"
        ? "Some services are degraded. Verification may be delayed."
        : overall === "unknown"
          ? "We can’t confirm system health right now."
          : "All systems operational.";

  return { overall, summary };
}
