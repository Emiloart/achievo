"use client";

import { useEffect, useState } from "react";
import * as adminApi from "../../../lib/adminApi";
import { TwoStepAction } from "../../../components/actions/TwoStepAction";
import { StatusPill } from "../../../components/ui/StatusPill";

export default function IndexerPage() {
  const [status, setStatus] = useState<any>(null);
  const [fromBlock, setFromBlock] = useState("0");
  const [toBlock, setToBlock] = useState("0");
  const [rebuildFrom, setRebuildFrom] = useState("0");
  const [rebuildTo, setRebuildTo] = useState("0");
  const [projectorKeys, setProjectorKeys] = useState("legacy_badges_v1,legacy_goals_v1");

  useEffect(() => {
    adminApi.indexerStatus().then(setStatus);
  }, []);

  return (
    <div className="stack">
      <div className="card">
        <h3>Indexer Status</h3>
        <div className="muted">Chain: {status?.chainId ?? "N/A"}</div>
        <div className="muted">Head: {status?.headBlock ?? "N/A"}</div>
        <div className="muted">Processed: {status?.latestProcessedBlock ?? "N/A"}</div>
        <div className="muted">Finalized: {status?.latestFinalizedBlock ?? "N/A"}</div>
        <div className="pill-group">
          <StatusPill status={status?.enabled ? "ENABLED" : "DISABLED"} />
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Backfill range</h3>
          <div className="stack">
            <div className="field">
              <label className="muted">From block</label>
              <input className="input" value={fromBlock} onChange={(e) => setFromBlock(e.target.value)} />
            </div>
            <div className="field">
              <label className="muted">To block</label>
              <input className="input" value={toBlock} onChange={(e) => setToBlock(e.target.value)} />
            </div>
          </div>
        </div>
        <TwoStepAction
          title="Execute backfill"
          action="indexer_backfill"
          payload={{
            fromBlock: Number(fromBlock),
            toBlock: Number(toBlock),
            chainId: status?.chainId || 0,
          }}
          onComplete={() => adminApi.indexerStatus().then(setStatus)}
        />
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Rebuild projections</h3>
          <div className="stack">
            <div className="field">
              <label className="muted">From block</label>
              <input className="input" value={rebuildFrom} onChange={(e) => setRebuildFrom(e.target.value)} />
            </div>
            <div className="field">
              <label className="muted">To block</label>
              <input className="input" value={rebuildTo} onChange={(e) => setRebuildTo(e.target.value)} />
            </div>
            <div className="field">
              <label className="muted">Projector keys</label>
              <input
                className="input"
                value={projectorKeys}
                onChange={(e) => setProjectorKeys(e.target.value)}
              />
            </div>
          </div>
        </div>
        <TwoStepAction
          title="Execute rebuild"
          action="indexer_rebuild"
          payload={{
            fromBlock: Number(rebuildFrom),
            toBlock: Number(rebuildTo),
            chainId: status?.chainId || 0,
            projectorKeys: projectorKeys.split(",").map((value) => value.trim()).filter(Boolean),
          }}
          onComplete={() => adminApi.indexerStatus().then(setStatus)}
        />
      </div>
    </div>
  );
}
