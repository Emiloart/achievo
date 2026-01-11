"use client";

import { getApiError } from "../../../../lib/apiError";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { TrustCheck, TrustState } from "../../../../trust/types";
import { TrustCard } from "../../../../components/trust/TrustCard";
import { PageHeader } from "../../../../components/nav/PageHeader";
import { VerifyResultCard } from "../../../../components/domain/verify/VerifyResultCard";
import { LoadingState } from "../../../../components/states/LoadingState";
import { Badge, Button, CopyField, HashDisplay, Section } from "../../../../components/ui";

type VerifyTxResponse = {
  type: string;
  txHash: string;
  valid: boolean;
  checks: {
    anchorPresent: boolean;
    anchorVerified: boolean | "unknown";
  };
  details: {
    hash?: string | null;
    chainId?: number | null;
    contract?: string | null;
    kind?: string | null;
    submitter?: string | null;
    anchoredAt?: string | null;
  };
};

function explorerBase(chainId?: number | null) {
  if (chainId === 84532) return "https://sepolia.basescan.org";
  return "https://sepolia.basescan.org";
}

function buildChecks(checks: VerifyTxResponse["checks"]): { state: TrustState; list: TrustCheck[] } {
  const anchorPresent = Boolean(checks?.anchorPresent);
  const anchorVerified = checks?.anchorVerified;
  const list: TrustCheck[] = [
    { name: "Anchor present", status: anchorPresent ? "pass" : "fail" },
    {
      name: "Anchor verified",
      status: anchorVerified === "unknown" ? "unknown" : anchorVerified ? "pass" : "fail",
    },
  ];
  const state: TrustState = anchorVerified === true ? "VERIFIED" : anchorPresent ? "ANCHORED" : "UNVERIFIED";
  return { state, list };
}

export default function VerifyTxPage() {
  const params = useParams<{ txHash: string }>();
  const txHash = params.txHash;
  const [data, setData] = useState<VerifyTxResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/verify/tx/${txHash}`);
        if (!res.ok) {
          const { message, requestId } = await getApiError(res, "Verification failed.");
          const err = new Error(message);
          (err as { requestId?: string | null }).requestId = requestId;
          throw err;
        }
        const json = await res.json();
        if (!active) return;
        setData(json);
      } catch (e: any) {
        if (!active) return;
        setError({ message: e?.message || "Verification failed", requestId: e?.requestId });
        setData(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    if (txHash) void load();
    return () => {
      active = false;
    };
  }, [txHash]);

  const trust = useMemo(() => (data ? buildChecks(data.checks) : null), [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transaction verification" description="Decode anchor events from registry transactions." />
        <LoadingState title="Checking transaction" description="Inspecting anchor events and receipts." />
      </div>
    );
  }

  if (error) {
    const status = error.message.toLowerCase().includes("not found") ? "NOT_FOUND" : "ERROR";
    return (
      <div className="space-y-6">
        <PageHeader title="Transaction verification" description="Decode anchor events from registry transactions." />
        <VerifyResultCard
          status={status}
          title="Transaction verification"
          idLabel="Transaction hash"
          idValue={txHash}
          reason={error.message}
          requestId={error.requestId || null}
        />
      </div>
    );
  }

  if (!data || !trust) {
    return (
      <div className="space-y-6">
        <PageHeader title="Transaction verification" description="Decode anchor events from registry transactions." />
        <VerifyResultCard status="NOT_FOUND" title="Transaction verification" idLabel="Transaction hash" idValue={txHash} />
      </div>
    );
  }

  const chain = data.details || {};
  const anchor = {
    chainId: chain.chainId,
    contract: chain.contract,
    txHash: data.txHash,
  };

  const status = data.valid ? (data.checks.anchorVerified === "unknown" ? "UNKNOWN" : "VERIFIED") : "INVALID";
  const unknownReason =
    status === "UNKNOWN"
      ? "Unable to confirm right now (RPC unavailable/circuit breaker). Not a failure."
      : undefined;

  return (
    <div className="space-y-10">
      <PageHeader title="Transaction verification" description="Decode anchor events from registry transactions." />
      <VerifyResultCard
        status={status}
        title="Transaction verification"
        idLabel="Transaction hash"
        idValue={data.txHash}
        source={chain.contract}
        timestamp={chain.anchoredAt}
        reason={unknownReason || (data.valid ? undefined : "No anchor event was found in this transaction.")}
        meta={[
          { label: "Anchored hash", value: chain.hash },
          { label: "Submitter", value: chain.submitter },
          { label: "Kind", value: chain.kind },
        ]}
      />

      <Section title="Anchor transaction summary" description="Detailed checks for registry events.">
        <div className="flex flex-wrap gap-3">
          <Badge variant={data.valid ? "verified" : "unverified"}>
            {data.valid ? "Anchor found" : "No anchor event"}
          </Badge>
          {chain.kind && <Badge variant="neutral">{chain.kind}</Badge>}
        </div>
        <TrustCard
          title="Anchor transaction summary"
          subtitle={data.txHash}
          state={trust.state}
          checks={trust.list}
          hash={chain.hash || undefined}
          anchor={anchor}
          cta={
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}>
              Copy verification report
            </Button>
          }
        />
      </Section>

      <Section title="Transaction details" description="Decoded anchor event fields and registry context.">
        <div className="grid gap-4 md:grid-cols-2">
          <CopyField label="Transaction hash" value={data.txHash} />
          {chain.hash && <CopyField label="Anchored hash" value={chain.hash} />}
          {chain.contract && (
            <HashDisplay
              label="Registry address"
              value={chain.contract}
              href={`${explorerBase(chain.chainId)}/address/${chain.contract}`}
            />
          )}
          <HashDisplay
            label="Transaction"
            value={data.txHash}
            href={`${explorerBase(chain.chainId)}/tx/${data.txHash}`}
          />
          {chain.submitter && <CopyField label="Submitter" value={chain.submitter} />}
          {chain.anchoredAt && <CopyField label="Anchored at" value={chain.anchoredAt} />}
        </div>
      </Section>
    </div>
  );
}
