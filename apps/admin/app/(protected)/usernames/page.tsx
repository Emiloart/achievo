"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as adminApi from "../../../lib/adminApi";
import { TwoStepAction } from "../../../components/actions/TwoStepAction";
import { StatusPill } from "../../../components/ui/StatusPill";

export default function UsernamesPage() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any | null>(null);
  const [flagReason, setFlagReason] = useState("");

  const runSearch = async () => {
    const data = await adminApi.usernameSearch(query.trim());
    setResults(data);
  };

  useEffect(() => {
    if (initialQuery) {
      void runSearch();
    }
  }, []);

  return (
    <div className="stack">
      <div className="card">
        <h3>Search usernames</h3>
        <div className="stack">
          <input className="input" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn secondary" type="button" onClick={runSearch}>
            Search
          </button>
        </div>
      </div>

      {results ? (
        <>
          <div className="card">
            <h3>Orders</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Maker</th>
                </tr>
              </thead>
              <tbody>
                {results.orders.map((order: any) => (
                  <tr key={order.id}>
                    <td className="code">{order.type}</td>
                    <td>
                      <StatusPill status={order.status} />
                    </td>
                    <td className="code">{order.priceWei || order.price}</td>
                    <td className="code">{order.makerAddress?.slice(0, 12)}…</td>
                  </tr>
                ))}
                {!results.orders.length ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      No orders for this query.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Trades</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Tx</th>
                </tr>
              </thead>
              <tbody>
                {results.trades.map((trade: any) => (
                  <tr key={trade.id}>
                    <td>
                      <StatusPill status={trade.status} />
                    </td>
                    <td className="code">{trade.priceWei || trade.price}</td>
                    <td className="code">{trade.txHash?.slice(0, 12)}…</td>
                  </tr>
                ))}
                {!results.trades.length ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      No trades for this query.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Settlement actions</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Tx</th>
                  <th>Observed</th>
                </tr>
              </thead>
              <tbody>
                {results.chainActions?.map((action: any) => (
                  <tr key={action.id}>
                    <td>
                      <StatusPill status={action.status} />
                    </td>
                    <td className="code">{action.txHash?.slice(0, 12)}…</td>
                    <td>{new Date(action.observedAt).toLocaleString()}</td>
                  </tr>
                ))}
                {!results.chainActions?.length ? (
                  <tr>
                    <td colSpan={3} className="muted">
                      No settlement actions recorded.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="grid cols-2">
            <div className="card">
              <h3>Flag suspicious</h3>
              <div className="field">
                <label className="muted">Reason</label>
                <textarea
                  className="textarea"
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                />
              </div>
            </div>
            <TwoStepAction
              title="Create admin flag"
              action="username_mark_suspicious"
              payload={{
                normalized: results.usernames?.[0]?.usernameNormalized || null,
                handleHash: null,
                reason: flagReason || null,
              }}
            />
          </div>
        </>
      ) : (
        <div className="card">Search for a username to view orders and trades.</div>
      )}
    </div>
  );
}
