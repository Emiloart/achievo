"use client";

import { useEffect, useState } from "react";
import * as adminApi from "../../../lib/adminApi";
import { TwoStepAction } from "../../../components/actions/TwoStepAction";

export default function AnchoringPage() {
  const [status, setStatus] = useState<any>(null);
  const [entityType, setEntityType] = useState("PROOF");
  const [entityId, setEntityId] = useState("");

  useEffect(() => {
    adminApi.anchoringStatus().then(setStatus);
  }, []);

  return (
    <div className="stack">
      <div className="card">
        <h3>Anchoring Status</h3>
        <div className="muted">Registry: {status?.registry || "Not configured"}</div>
        <div className="muted">Pending jobs: {status?.pendingJobs ?? 0}</div>
        <div className="muted">Pending actions: {status?.pendingActions ?? 0}</div>
      </div>

      <TwoStepAction
        title="Retry anchor by entity"
        action="anchor_retry"
        payload={{ entityType, entityId }}
        onComplete={() => adminApi.anchoringStatus().then(setStatus)}
      />

      <div className="card">
        <h3>Retry target</h3>
        <div className="stack">
          <div className="field">
            <label className="muted">Entity type</label>
            <select className="select" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="PROOF">Proof</option>
              <option value="VALIDATION">Validation</option>
              <option value="EXPORT">Export</option>
              <option value="SUBMISSION">Submission</option>
            </select>
          </div>
          <div className="field">
            <label className="muted">Entity ID</label>
            <input className="input" value={entityId} onChange={(e) => setEntityId(e.target.value)} />
          </div>
        </div>
      </div>
    </div>
  );
}
