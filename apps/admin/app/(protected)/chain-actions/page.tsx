"use client";

import { useEffect, useState } from "react";
import * as adminApi from "../../../lib/adminApi";
import { StatusPill } from "../../../components/ui/StatusPill";
import { TwoStepAction } from "../../../components/actions/TwoStepAction";

export default function ChainActionsPage() {
  const [actions, setActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  const load = () => {
    setLoading(true);
    adminApi
      .chainActions({ limit: 50 })
      .then(setActions)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="stack">
      <div className="card">
        <h3>Chain Actions</h3>
        {loading ? (
          <div className="skeleton" style={{ marginTop: "12px" }} />
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Status</th>
                <th>Tx Hash</th>
                <th>Observed</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {actions.map((row) => (
                <tr key={row.id}>
                  <td className="code">{row.type}</td>
                  <td>
                    <StatusPill status={row.status} />
                  </td>
                  <td className="code">{row.txHash?.slice(0, 10)}…</td>
                  <td>{new Date(row.observedAt).toLocaleString()}</td>
                  <td>
                    <button className="btn secondary" type="button" onClick={() => setSelected(row)}>
                      Retry
                    </button>
                  </td>
                </tr>
              ))}
              {!actions.length ? (
                <tr>
                  <td colSpan={5} className="muted">
                    No chain actions recorded yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {selected ? (
        <TwoStepAction
          title={`Retry ${selected.type}`}
          action="chain_action_retry"
          payload={{ id: selected.id, force: selected.status === "FAILED" }}
          onComplete={load}
        />
      ) : null}
    </div>
  );
}
