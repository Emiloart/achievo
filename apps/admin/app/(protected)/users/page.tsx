"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as adminApi from "../../../lib/adminApi";
import { StatusPill } from "../../../components/ui/StatusPill";

export default function UsersPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  const runSearch = async () => {
    const data = await adminApi.userSearch(query.trim());
    setResults(data);
    setSelected(null);
  };

  useEffect(() => {
    if (initialQuery) {
      void runSearch();
    }
  }, []);

  const selectUser = async (user: any) => {
    const detail = await adminApi.userDetail(user.id);
    setSelected(detail);
  };

  return (
    <div className="stack">
      <div className="card">
        <h3>Search users</h3>
        <div className="stack">
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn secondary" type="button" onClick={runSearch}>
            Search
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Results</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Achievo ID</th>
              <th>Wallet</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row) => (
              <tr key={row.id} onClick={() => void selectUser(row)} style={{ cursor: "pointer" }}>
                <td>{row.userId}</td>
                <td className="code">{row.primaryWallet?.slice(0, 12)}…</td>
                <td>{new Date(row.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!results.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="stack">
          <div className="card">
            <h3>User detail</h3>
            <div className="muted">ID: {selected.user?.id}</div>
            <div className="muted">Achievo ID: {selected.user?.userId}</div>
            <div className="muted">Wallet: {selected.user?.primaryWallet}</div>
            <div className="pill-group">
              <StatusPill status={selected.risk?.riskLevel || "UNKNOWN"} />
              <StatusPill status={`Credibility ${selected.consistency?.credibilityScore ?? "N/A"}`} />
            </div>
          </div>

          {selected.chainActions?.length ? (
            <div className="card">
              <h3>Recent chain actions</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {selected.chainActions.map((row: any) => (
                    <tr key={row.id}>
                      <td className="code">{row.type}</td>
                      <td>
                        <StatusPill status={row.status} />
                      </td>
                      <td className="code">{row.txHash?.slice(0, 12)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
