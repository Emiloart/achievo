"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type DegradedCapabilities,
  type DegradedState,
  type HealthSnapshot,
  deriveCapabilities,
  fetchHealthSnapshot,
  summarizeHealth,
} from "../lib/health";

export type DegradedMode = {
  state: DegradedState;
  summary: string;
  capabilities: DegradedCapabilities;
  subsystems: HealthSnapshot[];
  checkedAt: string;
};

const DEFAULT_MODE: DegradedMode = {
  state: "unknown",
  summary: "We can’t confirm system health right now.",
  capabilities: {
    chainReads: false,
    chainWrites: false,
    indexerReads: false,
    anchoring: false,
    verifyRPC: false,
  },
  subsystems: [],
  checkedAt: new Date(0).toISOString(),
};

const POLL_INTERVAL_MS = 45000;
const HYSTERESIS_MS = 60000;

let cached: DegradedMode = DEFAULT_MODE;
let lastChange = 0;
let poller: ReturnType<typeof setInterval> | null = null;
const subscribers = new Set<(next: DegradedMode) => void>();

function severityRank(state: DegradedState) {
  if (state === "down") return 3;
  if (state === "degraded") return 2;
  if (state === "unknown") return 1;
  return 0;
}

function notify(next: DegradedMode) {
  cached = next;
  subscribers.forEach((cb) => cb(next));
}

async function refreshHealth() {
  const subsystems = await fetchHealthSnapshot();
  const { overall, summary } = summarizeHealth(subsystems);
  const capabilities = deriveCapabilities(subsystems);
  const now = Date.now();
  const next: DegradedMode = {
    state: overall,
    summary,
    capabilities,
    subsystems,
    checkedAt: new Date().toISOString(),
  };

  if (severityRank(next.state) < severityRank(cached.state) && now - lastChange < HYSTERESIS_MS) {
    return;
  }
  if (next.state !== cached.state) {
    lastChange = now;
  }
  notify(next);
}

function startPolling() {
  if (poller) return;
  void refreshHealth();
  poller = setInterval(() => {
    void refreshHealth();
  }, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (poller) {
    clearInterval(poller);
    poller = null;
  }
}

export function useDegradedMode(stalenessSeconds?: number) {
  const [mode, setMode] = useState<DegradedMode>(cached);

  useEffect(() => {
    const handler = (next: DegradedMode) => {
      if (!stalenessSeconds) {
        setMode(next);
        return;
      }
      const staleCutoff = Date.now() - stalenessSeconds * 1000;
      const subsystems = next.subsystems.map((item) => {
        const checkedAt = Date.parse(item.checkedAt || "");
        if (checkedAt && checkedAt < staleCutoff) {
          return { ...item, status: "unknown" as const, reason: "STALE_DATA" };
        }
        return item;
      });
      const { overall, summary } = summarizeHealth(subsystems);
      setMode({
        ...next,
        state: overall,
        summary,
        subsystems,
      });
    };
    subscribers.add(handler);
    startPolling();
    return () => {
      subscribers.delete(handler);
      if (subscribers.size === 0) stopPolling();
    };
  }, [stalenessSeconds]);

  return useMemo(() => mode, [mode]);
}
