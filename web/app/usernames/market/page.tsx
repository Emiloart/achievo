"use client";
import { useEffect, useState } from "react";

import { getApiError, getApiErrorMessage } from "../../../lib/apiError";
import toast from "react-hot-toast";
import { useBackendAuth } from "../../../hooks/useBackendAuth";
import { PageHeader } from "../../../components/nav/PageHeader";
import { AuthRequired } from "../../../components/states/AuthRequired";
import { EmptyState } from "../../../components/states/EmptyState";
import { ErrorState } from "../../../components/states/ErrorState";
import { LoadingState } from "../../../components/states/LoadingState";
import { StatusPill } from "../../../components/StatusPill";
import { Badge, Card, CardBody } from "../../../components/ui";

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
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null);
  const [pendingTrade, setPendingTrade] = useState<TradeItem | null>(null);
  const settlementMode = process.env.NEXT_PUBLIC_USERNAME_SETTLEMENT_MODE;

  const settlementTitle =
    settlementMode === "OPERATOR"
      ? "Operator settlement"
      : settlementMode === "SELLER_TX"
        ? "Seller transfer"
        : "Coordinated settlement";
  const settlementDescription =
    settlementMode === "OPERATOR"
      ? "The platform submits the registry transfer after acceptance and tracks confirmations. Payments are coordinated off-chain and are not escrowed by the protocol."
      : settlementMode === "SELLER_TX"
        ? "Sellers submit the on-chain transfer; the backend verifies and finalizes once confirmed. Payments are coordinated off-chain."
        : "Settlements are coordinated off-chain, with confirmations tracked once a transfer hash exists. Payments are not escrowed by the protocol.";

  const fetchAsks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/usernames/orders?type=ASK&status=OPEN&limit=20");
      if (!res.ok) {
        const { message, requestId } = await getApiError(res, "Failed to load listings.");
        const err = new Error(message);
        (err as { requestId?: string | null }).requestId = requestId;
        throw err;
      }
      const json = await res.json();
      setAsks(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError({ message: e?.message || "Failed to load listings", requestId: e?.requestId });
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

  const renderTradeStatus = (trade: TradeItem) => {
    if (trade.status === "PENDING" && !trade.txHash) return "Awaiting transfer submission (seller signature)";
    if (trade.status === "PENDING" && trade.txHash) return "Awaiting on-chain confirmations";
    if (trade.status === "CONFIRMED") return "Finalized";
    if (trade.status === "FAILED") return "Failed";
    if (trade.status === "DROPPED_REORG") return "Reorg detected; awaiting resync";
    if (trade.status === "UNKNOWN") return "Unable to confirm right now";
    return trade.status;
  };

  const renderOrderStatus = (status: string) => {
    if (status === "OPEN") return "Awaiting accept";
    if (status === "FILLED") return "Filled";
    if (status === "CANCELED") return "Canceled";
    if (status === "EXPIRED") return "Expired";
    return status;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Username Market"
        description="Browse open @username listings and claim via the registry."
      />

      <Card>
        <CardBody className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="info">How settlement works</Badge>
            <span className="text-sm font-semibold">{settlementTitle}</span>
          </div>
          <p className="text-xs text-textMuted">{settlementDescription}</p>
        </CardBody>
      </Card>

      {!user ? (
        <AuthRequired title="Sign in to trade" description="Connect your wallet to accept an order." />
      ) : null}

      {error ? <ErrorState message={error.message} requestId={error.requestId} onRetry={fetchAsks} /> : null}

      {loading ? (
        <LoadingState title="Loading listings" description="Fetching open username asks." />
      ) : asks.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {asks.map((ask) => (
            <div key={ask.id} className="rounded-xl border bg-white p-5 space-y-2 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <div className="text-lg font-semibold">@{ask.normalized}</div>
                <StatusPill status={ask.status} />
              </div>
              <div className="text-xs text-textMuted">{renderOrderStatus(ask.status)}</div>
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
        <EmptyState
          title="No open listings"
          description="Check back later or create an order from your identity profile."
          primaryAction={{ label: "Go to identity", href: "/identity" }}
        />
      )}
      {pendingTrade && (
        <Card>
          <CardBody className="space-y-2 text-sm text-gray-600">
            <div className="flex items-center justify-between">
              <div>Transfer for @{pendingTrade.normalized}</div>
              <StatusPill status={pendingTrade.status} />
            </div>
            <div>{renderTradeStatus(pendingTrade)}</div>
            {pendingTrade.txHash ? <div className="text-xs text-textMuted">{pendingTrade.txHash}</div> : null}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
