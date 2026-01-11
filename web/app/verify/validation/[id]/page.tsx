"use client";

import { getApiError } from "../../../../lib/apiError";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeValidationTrust } from "../../../../trust/compute";
import { TrustCard } from "../../../../components/trust/TrustCard";
import { PageHeader } from "../../../../components/nav/PageHeader";
import { VerifyResultCard } from "../../../../components/domain/verify/VerifyResultCard";
import { LoadingState } from "../../../../components/states/LoadingState";
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
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = token ? `?token=${encodeURIComponent(token)}` : "";
        const res = await fetch(`/api/verify/validation/${id}${query}`);
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
    void load();
    return () => {
      active = false;
    };
  }, [id, token]);

  const trust = useMemo(() => computeValidationTrust(data || undefined), [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Validation verification" description="Confirm a validator signature and anchor status." />
        <LoadingState title="Checking validation" description="Verifying signatures and anchoring metadata." />
      </div>
    );
  }

  if (error) {
    const status = error.message.toLowerCase().includes("not found") ? "NOT_FOUND" : "ERROR";
    return (
      <div className="space-y-6">
        <PageHeader title="Validation verification" description="Confirm a validator signature and anchor status." />
        <VerifyResultCard
          status={status}
          title="Validation verification"
          idLabel="Validation ID"
          idValue={id}
          reason={error.message}
          requestId={error.requestId || null}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader title="Validation verification" description="Confirm a validator signature and anchor status." />
        <VerifyResultCard status="NOT_FOUND" title="Validation verification" idLabel="Validation ID" idValue={id} />
      </div>
    );
  }

  const chain = data.details?.chain;
  const anchor = chain
    ? {
        chainId: chain.chainId,
        contract: chain.contract,
        txHash: chain.txHash,
      }
    : undefined;

  const hasUnknown = Object.values(data.checks || {}).includes("unknown");
  const status = data.valid ? (hasUnknown ? "UNKNOWN" : "VERIFIED") : hasUnknown ? "UNKNOWN" : "INVALID";
  const unknownReason =
    status === "UNKNOWN"
      ? "Unable to confirm right now (RPC unavailable/circuit breaker). Not a failure."
      : undefined;

  return (
    <div className="space-y-10">
      <PageHeader title="Validation verification" description="Confirm a validator signature and anchor status." />
      <VerifyResultCard
        status={status}
        title="Validation verification"
        idLabel="Validation ID"
        idValue={data.id}
        source={anchor?.contract}
        timestamp={chain?.anchoredAt}
        reason={unknownReason || (data.valid ? undefined : "Validator signature verification failed.")}
        meta={[
          { label: "Validator", value: data.details?.validatorWallet },
          { label: "Attestation hash", value: data.details?.attestationHash },
        ]}
      />

      <Section title="Validation trust summary" description="Detailed checks for signatures and anchors.">
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
