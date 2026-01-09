"use client";

import { getApiErrorMessage } from "../../../../lib/apiError";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import type { TrustCheck, TrustState } from "../../../../trust/types";
import { TrustCard } from "../../../../components/trust/TrustCard";
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
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/verify/anchor/${hash}`);
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
    if (hash) void load();
    return () => {
      active = false;
    };
  }, [hash]);

  const trust = useMemo(() => (data ? buildChecks(data.checks) : null), [data]);

  if (loading) return <div className="text-sm text-textMuted">Checking anchor...</div>;
  if (error) return <div className="text-sm text-danger">{error}</div>;
  if (!data || !trust) return <div className="text-sm text-textMuted">No data.</div>;

  const chain = data.details || {};
  const anchor = {
    chainId: chain.chainId,
    contract: chain.contract,
    txHash: chain.txHash,
  };

  return (
    <div className="space-y-10">
      <Section title="Anchor verification" description="Validate anchored hashes directly against the registry.">
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
