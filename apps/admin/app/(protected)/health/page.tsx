"use client";

import { useEffect, useState } from "react";
import * as adminApi from "../../../lib/adminApi";
import { StatusPill } from "../../../components/ui/StatusPill";

export default function HealthPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .health()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="card"><div className="skeleton" /></div>;
  }

  if (!data) {
    return <div className="card">No health data available.</div>;
  }

  return (
    <div className="stack">
      <div className="grid cols-3">
        <div className="card">
          <h3>Chain</h3>
          <StatusPill status={data.chain?.status || "UNKNOWN"} />
        </div>
        <div className="card">
          <h3>Indexer</h3>
          <StatusPill status={data.indexer?.status || "UNKNOWN"} />
        </div>
        <div className="card">
          <h3>Anchoring</h3>
          <StatusPill status={data.anchoring?.status || "UNKNOWN"} />
        </div>
      </div>

      <div className="card">
        <h3>Raw payload</h3>
        <pre className="code" style={{ overflowX: "auto" }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}
