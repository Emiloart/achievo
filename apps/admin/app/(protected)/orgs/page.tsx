"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as adminApi from "../../../lib/adminApi";
import { TwoStepAction } from "../../../components/actions/TwoStepAction";
import { StatusPill } from "../../../components/ui/StatusPill";

export default function OrgsPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [detail, setDetail] = useState<any | null>(null);

  const runSearch = async () => {
    const data = await adminApi.orgSearch(query.trim());
    setResults(data);
    setSelected(null);
    setDetail(null);
  };

  useEffect(() => {
    if (initialQuery) {
      void runSearch();
    }
  }, []);

  const selectOrg = async (org: any) => {
    setSelected(org);
    const detail = await adminApi.orgDetail(org.id);
    setDetail(detail);
  };

  return (
    <div className="stack">
      <div className="card">
        <h3>Search orgs</h3>
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
              <th>Handle</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {results.map((org) => (
              <tr key={org.id} onClick={() => void selectOrg(org)} style={{ cursor: "pointer" }}>
                <td>{org.handle}</td>
                <td>
                  <StatusPill status={org.onchainStatus || "OFFCHAIN"} />
                </td>
                <td>{new Date(org.createdAt).toLocaleString()}</td>
              </tr>
            ))}
            {!results.length ? (
              <tr>
                <td colSpan={3} className="muted">
                  No organizations found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <div className="stack">
          <div className="card">
            <h3>Org details</h3>
            <div className="muted">ID: {selected.id}</div>
            <div className="muted">Handle: {selected.handle}</div>
            <div className="muted">On-chain status: {selected.onchainStatus || "OFFCHAIN"}</div>
            <div className="muted">Tx hash: {selected.onchainCreationTxHash || "Not set"}</div>
          </div>

          <TwoStepAction
            title="Reverify org creation"
            action="org_reverify"
            payload={{ orgId: selected.id }}
            onComplete={() => void selectOrg(selected)}
          />

          {detail?.chainActions?.length ? (
            <div className="card">
              <h3>Related chain actions</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.chainActions.map((row: any) => (
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
