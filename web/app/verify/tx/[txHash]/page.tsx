"use client";

import { getApiErrorMessage } from "../../../../lib/apiError";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { TrustCheck, TrustState } from "../../../../trust/types";
import { TrustCard } from "../../../../components/trust/TrustCard";
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
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/verify/tx/${txHash}`);
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setData(json);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Verification failed");
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

  if (loading) return <div className="text-sm text-textMuted">Checking transaction...</div>;
  if (error) return <div className="text-sm text-danger">{error}</div>;
  if (!data || !trust) return <div className="text-sm text-textMuted">No data.</div>;

  const chain = data.details || {};
  const anchor = {
    chainId: chain.chainId,
    contract: chain.contract,
    txHash: data.txHash,
  };

  return (
    <div className="space-y-10">
      <Section title="Transaction verification" description="Decode anchor events from the registry transaction.">
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
