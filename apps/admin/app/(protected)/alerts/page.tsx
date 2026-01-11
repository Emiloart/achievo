"use client";

import { useEffect, useState } from "react";
import * as adminApi from "../../../lib/adminApi";
import { StatusPill } from "../../../components/ui/StatusPill";

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .alerts({ limit: 50 })
      .then(setAlerts)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card">
      <h3>Operational Alerts</h3>
      {loading ? (
        <div className="skeleton" style={{ marginTop: "12px" }} />
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Severity</th>
              <th>Type</th>
              <th>Message</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => (
              <tr key={alert.id}>
                <td>
                  <StatusPill status={alert.severity} />
                </td>
                <td className="code">{alert.type}</td>
                <td>{alert.message}</td>
                <td>{new Date(alert.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!alerts.length ? (
              <tr>
                <td colSpan={4} className="muted">
                  No alerts in the last period.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      )}
    </div>
  );
}
