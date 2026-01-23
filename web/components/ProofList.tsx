"use client";
import type { ProofArtifact } from "../hooks/useProofs";
import { usePolicy } from "../hooks/usePolicy";
import { Badge, Button, Card, CardBody, HashDisplay } from "./ui";
import { VisibilityControls } from "./VisibilityControls";
import { AnchorStatusBadge, AnchorTimeline } from "./domain/AnchorStatus";

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

export function ProofList({
  proofs,
  onAnchor,
  anchoringId,
  showAnchor,
  showControls,
  onRefresh,
}: {
  proofs: ProofArtifact[];
  onAnchor?: (id: string) => void;
  anchoringId?: string | null;
  showAnchor?: boolean;
  showControls?: boolean;
  onRefresh?: () => void;
}) {
  const { isEnabled, getMessage } = usePolicy();
  if (!proofs.length) {
    return <div className="text-sm text-textMuted">No proofs added yet.</div>;
  }

  return (
    <div className="space-y-4">
      {proofs.map((proof) => {
        const redaction = proof.redaction || "NONE";
        const showMetadata = showControls || redaction === "NONE";
        const title =
          proof.title || (proof.kind === "URL" ? "Link proof" : proof.kind === "FILE" ? "File proof" : "Proof");
        const displayTitle = showMetadata ? title : "Proof (redacted)";
        const anchorUrl = explorerLink(proof.chainId, proof.anchorTxHash);
        const isSubmitting = anchoringId === proof.id;

        return (
          <Card key={proof.id}>
            <CardBody className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold">{displayTitle}</div>
                  <div className="text-xs text-textMuted">
                    {proof.createdAt && <span>{formatDate(proof.createdAt)}</span>}
                    {proof.achievementId && <span> - Goal #{proof.achievementId}</span>}
                    {proof.badgeTokenId && <span> - Badge #{proof.badgeTokenId}</span>}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{proof.kind}</Badge>
                  {(proof.anchorTxHash || isSubmitting) && (
                    <AnchorStatusBadge
                      txHash={proof.anchorTxHash}
                      anchoredAt={proof.anchoredAt}
                      submitting={isSubmitting}
                    />
                  )}
                </div>
              </div>

              {showMetadata && proof.description && (
                <div className="text-sm text-textMuted whitespace-pre-wrap">{proof.description}</div>
              )}
              {!showMetadata && <Badge variant="private">Metadata hidden</Badge>}

              {showMetadata && proof.sha256 && <HashDisplay label="SHA-256" value={proof.sha256} />}

              <div className="flex flex-wrap items-center gap-3">
                {proof.kind === "URL" && proof.sourceUrl && showMetadata && (
                  <a
                    href={proof.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    Open link
                  </a>
                )}
                {proof.kind === "FILE" && proof.fileUrl && showMetadata && (
                  <a
                    href={proof.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-accent hover:underline"
                  >
                    View file
                  </a>
                )}
                {proof.anchorTxHash ? (
                  <HashDisplay label="Anchor tx" value={proof.anchorTxHash} href={anchorUrl} />
                ) : showAnchor && onAnchor ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onAnchor(proof.id)}
                    disabled={anchoringId === proof.id || !isEnabled("anchoringEnabled")}
                  >
                    {anchoringId === proof.id ? "Anchoring..." : "Anchor hash"}
                  </Button>
                ) : null}
                {showAnchor && !isEnabled("anchoringEnabled") ? (
                  <span className="text-xs text-warning">
                    {getMessage("anchoring") || "Anchoring is disabled by policy."}
                  </span>
                ) : null}
              </div>
              {(proof.anchorTxHash || isSubmitting) && (
                <AnchorTimeline txHash={proof.anchorTxHash} anchoredAt={proof.anchoredAt} submitting={isSubmitting} />
              )}

              {showControls && (
                <VisibilityControls
                  contentType="PROOF"
                  contentId={proof.id}
                  visibility={proof.visibility}
                  redaction={proof.redaction}
                  showRedaction
                  unlistedPublicId={proof.unlistedPublicId}
                  onUpdated={onRefresh ? () => onRefresh() : undefined}
                />
              )}
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
