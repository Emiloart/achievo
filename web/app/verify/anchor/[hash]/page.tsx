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

type VerifyAnchorResponse = {
  type: string;
  hash: string;
  valid: boolean;
  checks: {
    anchorPresent: boolean;
    anchorVerified: boolean | "unknown";
  };
  details: {
    chainId?: number | null;
    contract?: string | null;
    kind?: string | null;
    submitter?: string | null;
    anchoredAt?: string | null;
    txHash?: string | null;
  };
};

function explorerBase(chainId?: number | null) {
  if (chainId === 84532) return "https://sepolia.basescan.org";
  return "https://sepolia.basescan.org";
}

function buildChecks(checks: VerifyAnchorResponse["checks"]): { state: TrustState; list: TrustCheck[] } {
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

export default function VerifyAnchorPage() {
  const params = useParams<{ hash: string }>();
  const hash = params.hash;
  const [data, setData] = useState<VerifyAnchorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/verify/anchor/${hash}`);
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
    if (hash) void load();
    return () => {
      active = false;
    };
  }, [hash]);

  const trust = useMemo(() => (data ? buildChecks(data.checks) : null), [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Anchor verification" description="Validate hashes directly against the registry." />
        <LoadingState title="Checking anchor" description="Querying anchor registry and receipts." />
      </div>
    );
  }

  if (error) {
    const status = error.message.toLowerCase().includes("not found") ? "NOT_FOUND" : "ERROR";
    return (
      <div className="space-y-6">
        <PageHeader title="Anchor verification" description="Validate hashes directly against the registry." />
        <VerifyResultCard
          status={status}
          title="Anchor verification"
          idLabel="Anchor hash"
          idValue={hash}
          reason={error.message}
          requestId={error.requestId || null}
        />
      </div>
    );
  }

  if (!data || !trust) {
    return (
      <div className="space-y-6">
        <PageHeader title="Anchor verification" description="Validate hashes directly against the registry." />
        <VerifyResultCard status="NOT_FOUND" title="Anchor verification" idLabel="Anchor hash" idValue={hash} />
      </div>
    );
  }

  const chain = data.details || {};
  const anchor = {
    chainId: chain.chainId,
    contract: chain.contract,
    txHash: chain.txHash,
  };

  const status = data.valid ? (data.checks.anchorVerified === "unknown" ? "UNKNOWN" : "VERIFIED") : "INVALID";
  const unknownReason =
    status === "UNKNOWN"
      ? "Unable to confirm right now (RPC unavailable/circuit breaker). Not a failure."
      : undefined;

  return (
    <div className="space-y-10">
      <PageHeader title="Anchor verification" description="Validate hashes directly against the registry." />
      <VerifyResultCard
        status={status}
        title="Anchor verification"
        idLabel="Anchor hash"
        idValue={data.hash}
        source={chain.contract}
        timestamp={chain.anchoredAt}
        reason={unknownReason || (data.valid ? undefined : "Anchor record not found.")}
        meta={[
          { label: "Submitter", value: chain.submitter },
          { label: "Kind", value: chain.kind },
        ]}
      />

      <Section title="Anchor trust summary" description="Detailed checks for registry presence.">
        <div className="flex flex-wrap gap-3">
          <Badge variant={data.valid ? "verified" : "unverified"}>{data.valid ? "Anchored" : "Not found"}</Badge>
          {chain.kind && <Badge variant="neutral">{chain.kind}</Badge>}
        </div>
        <TrustCard
          title="Anchor trust summary"
          subtitle={data.hash}
          state={trust.state}
          checks={trust.list}
          hash={data.hash}
          anchor={anchor}
          cta={
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}>
              Copy verification report
            </Button>
          }
        />
      </Section>

      <Section title="Anchor details" description="Registry record fields pulled from chain.">
        <div className="grid gap-4 md:grid-cols-2">
          <CopyField label="Anchored hash" value={data.hash} />
          {chain.contract && (
            <HashDisplay
              label="Registry address"
              value={chain.contract}
              href={`${explorerBase(chain.chainId)}/address/${chain.contract}`}
            />
          )}
          {chain.txHash && (
            <HashDisplay
              label="Anchor transaction"
              value={chain.txHash}
              href={`${explorerBase(chain.chainId)}/tx/${chain.txHash}`}
            />
          )}
          {chain.submitter && <CopyField label="Submitter" value={chain.submitter} />}
          {chain.anchoredAt && <CopyField label="Anchored at" value={chain.anchoredAt} />}
        </div>
      </Section>
    </div>
  );
}
