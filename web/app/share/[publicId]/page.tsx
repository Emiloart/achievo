"use client";

import { getApiErrorMessage } from "../../../lib/apiError";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AnchorStatusBadge, AnchorTimeline } from "../../../components/domain/AnchorStatus";
import { EmptyState } from "../../../components/states/EmptyState";
import { LoadingState } from "../../../components/states/LoadingState";
import { Badge, ButtonLink, Card, CardBody, CardHeader, HashDisplay, Section } from "../../../components/ui";

type UnlistedPayload = {
  type: "PROOF" | "VALIDATION" | "EXPORT";
  item: any;
};

const API_BASE = "/api";

function formatDate(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
}

function explorerLink(chainId?: number | null, txHash?: string | null) {
  if (!txHash) return "";
  if (chainId === 84532) return `https://sepolia.basescan.org/tx/${txHash}`;
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

export default function SharePage() {
  const params = useParams<{ publicId: string }>();
  const publicId = params.publicId as string;
  const [payload, setPayload] = useState<UnlistedPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/privacy/unlisted/${publicId}`);
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const json = await res.json();
        if (!active) return;
        setPayload(json?.data || null);
      } catch (e: any) {
        if (!active) return;
        setError(e?.message || "Share link not available");
        setPayload(null);
      } finally {
        if (active) setLoading(false);
      }
    };
    if (publicId) void load();
    return () => {
      active = false;
    };
  }, [publicId]);

  if (loading) {
    return <LoadingState title="Loading shared content" description="Fetching the shared payload." rows={2} />;
  }

  if (error || !payload) {
    return (
      <EmptyState
        title="Share link not available"
        description={error || "This link is invalid or expired."}
        primaryAction={{ label: "Back to Achievo", href: "/" }}
      />
    );
  }

  if (payload.type === "PROOF") {
    const proof = payload.item || {};
    const anchorUrl = explorerLink(proof.chainId, proof.anchorTxHash);
    const fileUrl = proof.fileUrl ? `${proof.fileUrl}?token=${publicId}` : "";
    return (
      <div className="space-y-6">
        <Section title="Shared proof" description="This unlisted proof was shared by the owner.">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{proof.title || "Proof artifact"}</div>
                <div className="text-xs text-textMuted">{proof.description || "No description provided."}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="unlisted">Unlisted</Badge>
                {proof.anchorTxHash ? (
                  <AnchorStatusBadge txHash={proof.anchorTxHash} anchoredAt={proof.anchoredAt} />
                ) : null}
              </div>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-textMuted">
              <div>Type: {proof.kind || "Unknown"}</div>
              {proof.createdAt && <div>Created {formatDate(proof.createdAt)}</div>}
              {proof.sha256 && <HashDisplay label="SHA-256" value={proof.sha256} />}
              <div className="flex flex-wrap gap-2 text-xs">
                {proof.kind === "URL" && proof.sourceUrl && (
                  <a href={proof.sourceUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    Open source link
                  </a>
                )}
                {proof.kind === "FILE" && fileUrl && (
                  <a href={fileUrl} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                    View file
                  </a>
                )}
              </div>
              {proof.anchorTxHash ? (
                <>
                  <HashDisplay label="Anchor transaction" value={proof.anchorTxHash} href={anchorUrl} />
                  <AnchorTimeline txHash={proof.anchorTxHash} anchoredAt={proof.anchoredAt} />
                </>
              ) : null}
            </CardBody>
          </Card>
        </Section>
      </div>
    );
  }

  if (payload.type === "VALIDATION") {
    const item = payload.item || {};
    const attestation = item.attestation || {};
    const anchorUrl = explorerLink(attestation?.chainId, attestation?.anchorTxHash);
    return (
      <div className="space-y-6">
        <Section title="Shared validation" description="This validation is shared via an unlisted link.">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{item.request?.title || "Validation request"}</div>
                <div className="text-xs text-textMuted">{item.request?.summary || "Validator review"}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="partial">{item.request?.status || "PENDING"}</Badge>
                {attestation?.anchorTxHash ? (
                  <AnchorStatusBadge txHash={attestation.anchorTxHash} anchoredAt={attestation.anchoredAt} />
                ) : null}
              </div>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-textMuted">
              <div>
                Validator:{" "}
                {attestation?.validator?.displayName ||
                  attestation?.validatorWallet ||
                  item.request?.requestedValidatorWallet ||
                  "Unknown"}
              </div>
              {attestation?.message ? (
                <div className="text-sm text-text">{attestation.message}</div>
              ) : (
                <div className="text-xs text-textMuted">No validator note provided.</div>
              )}
              {attestation?.anchorTxHash ? (
                <>
                  <HashDisplay label="Anchor transaction" value={attestation.anchorTxHash} href={anchorUrl} />
                  <AnchorTimeline txHash={attestation.anchorTxHash} anchoredAt={attestation.anchoredAt} />
                </>
              ) : null}
            </CardBody>
          </Card>
        </Section>
      </div>
    );
  }

  if (payload.type === "EXPORT") {
    const exportItem = payload.item || {};
    const exportUrl = `/exports/${exportItem.publicId}?token=${publicId}`;
    return (
      <div className="space-y-6">
        <Section title="Shared export" description="Open the signed export package or verify it on the portal.">
          <Card>
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Profile export</div>
                <div className="text-xs text-textMuted">Format: {exportItem.format || "Unknown"}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="unlisted">Unlisted</Badge>
                {exportItem.anchor?.txHash ? (
                  <AnchorStatusBadge txHash={exportItem.anchor.txHash} anchoredAt={exportItem.anchor.anchoredAt} />
                ) : null}
              </div>
            </CardHeader>
            <CardBody className="flex flex-wrap items-center gap-3">
              <ButtonLink href={exportUrl} variant="secondary">
                Open export
              </ButtonLink>
              <ButtonLink href={`/verify/export/${exportItem.publicId}?token=${publicId}`} variant="ghost">
                Verify export
              </ButtonLink>
              {exportItem.anchor?.txHash ? (
                <AnchorTimeline txHash={exportItem.anchor.txHash} anchoredAt={exportItem.anchor.anchoredAt} />
              ) : null}
            </CardBody>
          </Card>
        </Section>
      </div>
    );
  }

  return null;
}
