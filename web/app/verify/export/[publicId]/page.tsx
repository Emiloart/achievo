"use client";

import { getApiError } from "../../../../lib/apiError";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { computeExportTrust } from "../../../../trust/compute";
import { TrustCard } from "../../../../components/trust/TrustCard";
import { PageHeader } from "../../../../components/nav/PageHeader";
import { verifyBreadcrumbs } from "../../../../components/nav/breadcrumbs";
import { VerifyResultCard } from "../../../../components/domain/verify/VerifyResultCard";
import { LoadingState } from "../../../../components/states/LoadingState";
import { Badge, Button, CopyField, HashDisplay, Section } from "../../../../components/ui";

type VerifyResponse = {
  type: string;
  publicId: string;
  valid: boolean;
  redacted?: boolean;
  checks: Record<string, boolean | "unknown">;
  checksDetailed?: Array<{ name: string; status: "pass" | "fail" | "warn" | "unknown"; details?: any }>;
  details: any;
};

function explorerBase(chainId?: number | null) {
  if (chainId === 84532) return "https://sepolia.basescan.org";
  return "https://sepolia.basescan.org";
}

export default function VerifyExportPage() {
  const params = useParams<{ publicId: string }>();
  const searchParams = useSearchParams();
  const publicId = params.publicId;
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
        const res = await fetch(`/api/verify/export/${publicId}${query}`);
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
  }, [publicId, token]);

  const trust = useMemo(() => computeExportTrust(data || undefined), [data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Export verification"
          description="Independent verification of signed and anchored exports."
          breadcrumbs={verifyBreadcrumbs("Export")}
        />
        <LoadingState title="Checking export" description="Verifying export signatures and anchor status." />
      </div>
    );
  }

  if (error) {
    const status = error.message.toLowerCase().includes("not found") ? "NOT_FOUND" : "ERROR";
    return (
      <div className="space-y-6">
        <PageHeader
          title="Export verification"
          description="Independent verification of signed and anchored exports."
          breadcrumbs={verifyBreadcrumbs("Export")}
        />
        <VerifyResultCard
          status={status}
          title="Export verification"
          idLabel="Export ID"
          idValue={publicId}
          reason={error.message}
          requestId={error.requestId || null}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Export verification"
          description="Independent verification of signed and anchored exports."
          breadcrumbs={verifyBreadcrumbs("Export")}
        />
        <VerifyResultCard status="NOT_FOUND" title="Export verification" idLabel="Export ID" idValue={publicId} />
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
    status === "UNKNOWN" ? "Unable to confirm right now (RPC unavailable/circuit breaker). Not a failure." : undefined;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Export verification"
        description="Independent verification of signed exports."
        breadcrumbs={verifyBreadcrumbs("Export")}
      />
      <VerifyResultCard
        status={status}
        title="Export verification"
        idLabel="Export ID"
        idValue={data.publicId}
        source={anchor?.contract}
        timestamp={chain?.anchoredAt}
        reason={unknownReason || (data.valid ? undefined : "Export verification failed.")}
        checks={data.checksDetailed}
        details={data.details}
        meta={[
          { label: "Snapshot hash", value: data.details?.snapshotHash },
          { label: "Signer", value: data.details?.signerAddress },
        ]}
      />

      <Section title="Export trust summary" description="Detailed verification checks and anchors.">
        <div className="flex flex-wrap gap-3">
          <Badge variant={data.valid ? "verified" : "unverified"}>{data.valid ? "Verified" : "Failed"}</Badge>
          {data.redacted && <Badge variant="private">Redacted</Badge>}
        </div>
        <TrustCard
          title="Export trust summary"
          subtitle={data.publicId}
          state={trust.state}
          checks={trust.checks}
          hash={data.details?.snapshotHash}
          anchor={anchor}
          cta={
            <Button variant="secondary" onClick={() => navigator.clipboard.writeText(JSON.stringify(data, null, 2))}>
              Copy verification report
            </Button>
          }
        />
      </Section>

      <Section title="Export details" description="Underlying metadata used to verify the snapshot.">
        <div className="grid gap-4 md:grid-cols-2">
          <CopyField label="Snapshot hash" value={data.details?.snapshotHash || ""} />
          <CopyField label="Signer" value={data.details?.signerAddress || ""} />
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
