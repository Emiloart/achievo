"use client";

import { useState } from "react";
import * as adminApi from "../../lib/adminApi";

type ActionProps = {
  action: string;
  payload: Record<string, any>;
  title: string;
  onComplete?: (result: any) => void;
};

export function TwoStepAction({ action, payload, title, onComplete }: ActionProps) {
  const [preview, setPreview] = useState<any>(null);
  const [intentId, setIntentId] = useState("");
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const [typed, setTyped] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const runDry = async () => {
    setLoading(true);
    setError("");
    try {
      const res: any = await adminApi.dryRun(action, payload);
      setPreview(res.preview);
      setIntentId(res.intentId);
      setConfirmPhrase(res.confirmPhrase);
    } catch (err: any) {
      setError(err?.message || "Dry-run failed");
    } finally {
      setLoading(false);
    }
  };

  const runExecute = async () => {
    if (typed !== confirmPhrase) {
      setError("Confirmation phrase does not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res: any = await adminApi.execute(intentId, confirmPhrase, payload);
      setResult(res.result);
      onComplete?.(res.result);
    } catch (err: any) {
      setError(err?.message || "Execution failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h3>{title}</h3>
      <div className="stack">
        <button className="btn secondary" type="button" onClick={runDry} disabled={loading}>
          {loading ? "Running dry-run..." : "Dry-run"}
        </button>
        {preview ? (
          <div className="stack">
            <div className="code">{JSON.stringify(preview, null, 2)}</div>
            <div className="field">
              <label className="muted">Type “{confirmPhrase}” to confirm</label>
              <input className="input" value={typed} onChange={(e) => setTyped(e.target.value)} />
            </div>
            <button className="btn primary" type="button" onClick={runExecute} disabled={loading}>
              {loading ? "Executing..." : "Execute"}
            </button>
          </div>
        ) : null}
        {result ? <div className="status-pill success">Action completed</div> : null}
        {error ? <div className="status-pill danger">{error}</div> : null}
      </div>
    </div>
  );
}
