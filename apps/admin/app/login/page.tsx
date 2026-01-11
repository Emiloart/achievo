"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import * as adminApi from "../../lib/adminApi";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await adminApi.login(email, password);
      router.replace("/");
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
      <form onSubmit={onSubmit} className="card" style={{ width: "420px", display: "grid", gap: "16px" }}>
        <div>
          <h2 style={{ margin: 0 }}>Admin Sign In</h2>
          <p className="muted" style={{ marginTop: "6px" }}>
            Use your admin credentials to access operational controls.
          </p>
        </div>
        <div className="field">
          <label className="muted">Email</label>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label className="muted">Password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error ? <div className="status-pill danger">{error}</div> : null}
        <button className="btn primary" type="submit" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
