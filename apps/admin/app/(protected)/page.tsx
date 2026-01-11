"use client";

import { useEffect, useState } from "react";
import * as adminApi from "../../lib/adminApi";
import { StatusPill } from "../../components/ui/StatusPill";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .overview()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card">
            <div className="skeleton" style={{ width: "60%", marginBottom: "12px" }} />
            <div className="skeleton" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) {
    return <div className="card">Unable to load overview.</div>;
  }

  return (
    <div className="stack">
      <div className="grid cols-3">
        <div className="card">
          <h3>Chain health</h3>
          <StatusPill status={data.health?.chain?.status || "UNKNOWN"} />
        </div>
        <div className="card">
          <h3>Indexer lag</h3>
          <div className="muted">{data.health?.indexer?.lagBlocks ?? "N/A"} blocks</div>
        </div>
        <div className="card">
          <h3>Anchoring backlog</h3>
          <div className="muted">{data.anchoring?.pendingJobs ?? 0} jobs</div>
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h3>Chain actions</h3>
          <div className="muted">Pending: {data.chainActions?.pending ?? 0}</div>
          <div className="muted">Stuck: {data.chainActions?.stuck ?? 0}</div>
        </div>
        <div className="card">
          <h3>Alerts (24h)</h3>
          <div className="pill-group">
            {Object.entries(data.alertsLast24h || {}).map(([key, value]) => (
              <span key={key} className="status-pill info">
                {key}: {value as any}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Recent rebuild runs</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Run</th>
              <th>Status</th>
              <th>Range</th>
            </tr>
          </thead>
          <tbody>
            {(data.rebuildRuns || []).map((run: any) => (
              <tr key={run.id}>
                <td className="code">{run.id}</td>
                <td>
                  <StatusPill status={run.status} />
                </td>
                <td>
                  {run.fromBlock} → {run.toBlock}
                </td>
              </tr>
            ))}
            {!data.rebuildRuns?.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  No rebuild runs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
