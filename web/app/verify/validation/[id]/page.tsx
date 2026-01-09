"use client";

import { getApiErrorMessage } from "../../../../lib/apiError";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeValidationTrust } from "../../../../trust/compute";
import { TrustCard } from "../../../../components/trust/TrustCard";
import { Badge, Button, CopyField, HashDisplay, Section } from "../../../../components/ui";

type VerifyResponse = {
  type: string;
  id: string;
  valid: boolean;
  redacted?: boolean;
  checks: Record<string, boolean | "unknown">;
  details: any;
};

function explorerBase(chainId?: number | null) {
  if (chainId === 84532) return "https://sepolia.basescan.org";
  return "https://sepolia.basescan.org";
}

export default function VerifyValidationPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const token = searchParams.get("token") || "";
  const [data, setData] = useState<VerifyResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const query = token ? `?token=${encodeURIComponent(token)}` : "";
        const res = await fetch(`/api/verify/validation/${id}${query}`);
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
    void load();
    return () => {
      active = false;
    };
  }, [id, token]);

  const trust = useMemo(() => computeValidationTrust(data || undefined), [data]);

  if (loading) return <div className="text-sm text-textMuted">Checking validation...</div>;
  if (error) return <div className="text-sm text-danger">{error}</div>;
  if (!data) return <div className="text-sm text-textMuted">No data.</div>;

  const chain = data.details?.chain;
  const anchor = chain
    ? {
        chainId: chain.chainId,
        contract: chain.contract,
        txHash: chain.txHash,
      }
    : undefined;

  return (
    <div className="space-y-10">
      <Section title="Validation verification" description="Confirm a validator signature and anchoring status.">
        <div className="flex flex-wrap gap-3">
          <Badge variant={data.valid ? "verified" : "unverified"}>{data.valid ? "Signature verified" : "Failed"}</Badge>
          {data.redacted && <Badge variant="private">Redacted</Badge>}
        </div>
        <TrustCard
          title="Validation trust summary"
          subtitle={data.id}
          state={trust.state}
          checks={trust.checks}
          hash={data.details?.attestationHash}
          anchor={anchor}
          cta={
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}>
              Copy verification report
            </Button>
          }
        />
      </Section>

      <Section title="Validation details" description="Signed payload and anchor metadata.">
        <div className="grid gap-4 md:grid-cols-2">
          <CopyField label="Validator" value={data.details?.validatorWallet || ""} />
          <CopyField label="Hash algorithm" value={data.details?.hashAlgo || ""} />
          <CopyField label="Attestation hash" value={data.details?.attestationHash || ""} />
          {chain?.contract && (
            <HashDisplay
              label="Anchor registry"
              value={chain.contract}
              href={`${explorerBase(chain.chainId)}/address/${chain.contract}`}
            />
          )}
          {chain?.txHash && (
            <HashDisplay
              label="Anchor transaction"
              value={chain.txHash}
              href={`${explorerBase(chain.chainId)}/tx/${chain.txHash}`}
            />
          )}
        </div>
      </Section>
    </div>
  );
}
