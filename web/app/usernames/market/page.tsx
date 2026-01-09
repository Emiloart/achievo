"use client";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "../../../lib/apiError";
import toast from "react-hot-toast";
import { useBackendAuth } from "../../../hooks/useBackendAuth";

type AskItem = {
  id: string;
  normalized: string;
  handleHash?: string | null;
  makerAchusrId?: string | null;
  makerAddress?: string | null;
  priceWei: string;
  currency: string;
  status: string;
};

type TradeItem = {
  id: string;
  normalized: string;
  status: string;
  txHash?: string | null;
};

export default function UsernameMarketPage() {
  const { user } = useBackendAuth();
  const [asks, setAsks] = useState<AskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingTrade, setPendingTrade] = useState<TradeItem | null>(null);

  const fetchAsks = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/usernames/orders?type=ASK&status=OPEN&limit=20");
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      setAsks(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAsks();
  }, []);

  useEffect(() => {
    if (!pendingTrade || pendingTrade.status === "CONFIRMED" || pendingTrade.status === "FAILED") {
      return;
    }
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/usernames/trades?handle=${pendingTrade.normalized}&limit=10`);
        if (!res.ok) return;
        const json = await res.json();
        const rows = Array.isArray(json?.data) ? json.data : [];
        const match = rows.find((row: TradeItem) => row.id === pendingTrade.id);
        if (!active || !match) return;
        setPendingTrade(match);
      } catch {
        // ignore transient polling failures
      }
    };
    void poll();
    const timer = setInterval(poll, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [pendingTrade]);

  const buyUsername = async (askId: string) => {
    if (!user) {
      toast.error("Sign in to buy a username");
      return;
    }
    const promise = fetch(`/api/usernames/orders/${askId}/accept`, {
      method: "POST",
      credentials: "include",
    }).then(async (res) => {
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const json = await res.json();
      const trade = json?.data?.trade as TradeItem | undefined;
      if (trade) setPendingTrade(trade);
    });
    toast.promise(promise, {
      loading: "Processing purchase...",
      success: "Transfer pending confirmations",
      error: "Purchase failed",
    });
    try {
      await promise;
      await fetchAsks();
    } catch {
      // toast handles error
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Username Market</h2>
        <p className="text-sm text-gray-600">Browse open @username listings and claim via the registry.</p>
      </div>
      {error && (
        <div className="rounded-xl border bg-red-50 text-red-700 px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button className="text-sm underline" onClick={fetchAsks}>
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <div className="text-sm text-gray-500">Loading listings...</div>
      ) : asks.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {asks.map((ask) => (
            <div key={ask.id} className="rounded-xl border bg-white p-5 space-y-2 shadow-sm">
              <div className="text-lg font-semibold">@{ask.normalized}</div>
              <div className="text-sm text-gray-600">Seller: {ask.makerAchusrId || ask.makerAddress}</div>
              <div className="text-sm text-gray-600">
                Price: {ask.priceWei} {ask.currency}
              </div>
              <button
                className="px-3 py-2 rounded-md bg-brand-600 text-white text-sm"
                onClick={() => buyUsername(ask.id)}
              >
                Buy
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No open listings yet.</div>
      )}
      {pendingTrade && (
        <div className="rounded-xl border bg-white p-4 text-sm text-gray-600">
          Transfer status for @{pendingTrade.normalized}: {pendingTrade.status}
        </div>
      )}
    </div>
  );
}
