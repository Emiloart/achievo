"use client";

import { getApiErrorMessage } from "../../../lib/apiError";
import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { verifyMessage } from "viem";
import {
  Badge,
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  CopyField,
  EmptyState,
  HashDisplay,
  QRCode,
  Section,
} from "../../../components/ui";
import { TrustCard } from "../../../components/trust/TrustCard";
import { computeExportTrust } from "../../../trust/compute";

type ExportBundle = {
  publicId: string;
  format: "JSON" | "JSONLD" | "PDF";
  snapshot?: any;
  snapshotHash: string;
  signature: string;
  signatureType: string;
  signerAddress: string;
  issuedAt?: number;
  anchor?: { chainId?: number; contract?: string; txHash?: string } | null;
  downloadUrl?: string | null;
  jsonld?: any;
};

type VerifyState = {
  status: "idle" | "valid" | "invalid";
  message: string;
  hash?: string;
  hashMatch?: boolean;
  signatureValid?: boolean;
};

const API_BASE = "/api";

function stableStringify(value: any): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(",")}}`;
}

async function sha256Hex(payload: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return `0x${hex}`;
}

function explorerLink(chainId?: number, txHash?: string) {
  if (!txHash) return "";
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

export default function ExportPage() {
  const params = useParams<{ publicId: string }>();
  const searchParams = useSearchParams();
  const publicId = params.publicId as string;
  const tokenParam = searchParams.get("token");
  const token = tokenParam || publicId;
  const [bundle, setBundle] = useState<ExportBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifyState, setVerifyState] = useState<VerifyState>({ status: "idle", message: "" });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/exports/${publicId}?token=${encodeURIComponent(token)}`);
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setBundle(json.data);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Export not found");
        setBundle(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    if (publicId) void load();
    return () => {
      active = false;
    };
  }, [publicId, token]);

  useEffect(() => {
    const verify = async () => {
      if (!bundle?.snapshot || !bundle.signature || !bundle.signerAddress) {
        setVerifyState({ status: "idle", message: "" });
        return;
      }
      try {
        const canonical = stableStringify(bundle.snapshot);
        const hash = await sha256Hex(canonical);
        const message = `Achievo Profile Export:\n${hash}`;
        const signatureValid = await verifyMessage({
          address: bundle.signerAddress as `0x${string}`,
          message,
          signature: bundle.signature as `0x${string}`,
        });
        const hashMatch = hash.toLowerCase() === bundle.snapshotHash.toLowerCase();
        setVerifyState({
          status: signatureValid && hashMatch ? "valid" : "invalid",
          message: hashMatch ? "" : "Snapshot hash mismatch",
          hash,
          hashMatch,
          signatureValid,
        });
      } catch (e: any) {
        setVerifyState({ status: "invalid", message: e?.message || "Verification failed" });
      }
    };
    void verify();
  }, [bundle]);

  const downloadJson = (payload: any, filename: string) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const anchorLink = bundle?.anchor?.txHash ? explorerLink(bundle.anchor.chainId, bundle.anchor.txHash) : "";
  const downloadUrl = bundle?.downloadUrl ? `${bundle.downloadUrl}?token=${encodeURIComponent(token)}` : "";
  const anchorPresent = Boolean(bundle?.anchor?.txHash || bundle?.anchor?.contract);

  const verificationBadge = useMemo(() => {
    if (verifyState.status === "valid") return { label: "Signature verified", variant: "verified" as const };
    if (verifyState.status === "invalid") return { label: "Signature invalid", variant: "danger" as const };
    return { label: "Verification pending", variant: "partial" as const };
  }, [verifyState.status]);

  const trustSummary = useMemo(
    () =>
      computeExportTrust({
        redacted: !bundle?.snapshot,
        checks: {
          hashMatch: verifyState.hashMatch,
          signatureValid: verifyState.signatureValid,
          expectedSignerMatch: "unknown",
          anchorPresent,
          anchorVerified: anchorPresent ? "unknown" : false,
        },
      }),
    [bundle?.snapshot, verifyState.hashMatch, verifyState.signatureValid, anchorPresent],
  );

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined" || !bundle?.publicId) return "";
    const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : "";
    return `${window.location.origin}/exports/${bundle.publicId}${tokenQuery}`;
  }, [bundle?.publicId, token]);

  const verifyUrl = useMemo(() => {
    if (!bundle?.publicId) return null;
    return {
      pathname: "/verify/export/[publicId]",
      query: token ? { publicId: bundle.publicId, token } : { publicId: bundle.publicId },
    };
  }, [bundle?.publicId, token]);

  if (loading) {
    return <div className="text-textMuted text-sm">Loading export...</div>;
  }

  if (error || !bundle) {
    return (
      <EmptyState
        title="Export not available"
        description={error || "This export link is invalid or has expired."}
        action={
          <ButtonLink href="/" variant="secondary">
            Back to Achievo
          </ButtonLink>
        }
      />
    );
  }

  return (
    <div className="space-y-8">
      <Section title="Profile export" description="Signed snapshot of the profile at the time of issue.">
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs text-textMuted">Public ID</div>
              <div className="text-base font-semibold">{bundle.publicId}</div>
              <div className="text-xs text-textMuted">
                Issued {bundle.issuedAt ? new Date(bundle.issuedAt * 1000).toLocaleString() : "Recently"}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="neutral">{bundle.format}</Badge>
              <Badge variant={verificationBadge.variant}>{verificationBadge.label}</Badge>
            </div>
          </CardBody>
        </Card>
      </Section>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <TrustCard
            title="Verification summary"
            subtitle="Shows signature and anchor checks for this export."
            state={trustSummary.state}
            checks={trustSummary.checks}
            hash={bundle.snapshotHash}
            anchor={bundle.anchor || undefined}
            cta={
              verifyUrl ? (
                <ButtonLink href={verifyUrl} variant="secondary" size="sm">
                  Open verification page
                </ButtonLink>
              ) : null
            }
          />
          {verifyState.message && <div className="text-xs text-warning">{verifyState.message}</div>}
          <Card>
            <CardHeader>
              <div className="text-sm font-semibold">Export metadata</div>
              <div className="text-xs text-textMuted">These fields are verifiable without the full snapshot.</div>
            </CardHeader>
            <CardBody className="space-y-3">
              <HashDisplay label="Snapshot hash" value={bundle.snapshotHash} />
              <HashDisplay label="Signer address" value={bundle.signerAddress} />
              <CopyField label="Signature" value={bundle.signature} />
              {bundle.anchor?.txHash && (
                <HashDisplay label="Anchor transaction" value={bundle.anchor.txHash} href={anchorLink} />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="text-sm font-semibold">Share and verify</div>
              <div className="text-xs text-textMuted">Use this link to share the signed export.</div>
            </CardHeader>
            <CardBody className="space-y-4">
              {shareUrl && <CopyField label="Share link" value={shareUrl} />}
              {shareUrl && (
                <div className="flex items-center gap-4">
                  <QRCode value={shareUrl} size={96} />
                  <div className="text-xs text-textMuted">
                    Scan to open the export. Share safely; this link may include an unlisted access token.
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {verifyUrl && (
                  <ButtonLink href={verifyUrl} variant="secondary" size="sm">
                    Verify export
                  </ButtonLink>
                )}
                <Link href="/" className="text-xs text-textMuted hover:text-text">
                  Back to Achievo
                </Link>
              </div>
            </CardBody>
          </Card>

          {bundle.format === "PDF" && downloadUrl && (
            <Card>
              <CardHeader>
                <div className="text-sm font-semibold">PDF export</div>
                <div className="text-xs text-textMuted">Download the signed PDF snapshot.</div>
              </CardHeader>
              <CardBody>
                <a href={downloadUrl} target="_blank" rel="noreferrer">
                  <Button variant="secondary">Download PDF</Button>
                </a>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      {bundle.format !== "PDF" && (
        <Section title="Export payload" description="Redacted exports omit sensitive profile data.">
          <Card>
            <CardBody className="space-y-4">
              {bundle.snapshot ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => downloadJson(bundle.snapshot, `achievo-export-${bundle.publicId}.json`)}
                    >
                      Download JSON
                    </Button>
                    {bundle.jsonld && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => downloadJson(bundle.jsonld, `achievo-export-${bundle.publicId}.jsonld`)}
                      >
                        Download JSON-LD
                      </Button>
                    )}
                  </div>
                  <pre className="text-xs rounded-2xl border border-border bg-surface2 p-3 max-h-96 overflow-auto">
                    {JSON.stringify(bundle.snapshot, null, 2)}
                  </pre>
                </>
              ) : (
                <div className="text-sm text-textMuted">Snapshot redacted.</div>
              )}
            </CardBody>
          </Card>
        </Section>
      )}
    </div>
  );
}
