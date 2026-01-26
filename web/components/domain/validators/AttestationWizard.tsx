"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSignTypedData } from "wagmi";
import { normalizeError } from "../../../lib/errorTaxonomy";
import { useValidationActions, type ValidationItem } from "../../../hooks/useValidations";
import { ErrorState } from "../../states/ErrorState";
import { LoadingState } from "../../states/LoadingState";
import { ConfirmDialog } from "../../ui/ConfirmDialog";
import { Badge, Button, Card, CardBody, CardHeader, Input, StatusBadge, Textarea, uiToast } from "../../ui";
import { UI_LABELS } from "../../../lib/uiCopy";

export type AttestationWizardProps = {
  item: ValidationItem;
  validatorWallet?: string;
  canAct: boolean;
  onComplete?: () => void;
};

type WizardPhase = "review" | "preparing" | "signing" | "submitting" | "done" | "revoking" | "revoked";

type WizardError = {
  message: string;
  retry?: () => void;
};

function shortId(value: string) {
  if (!value) return "";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function isLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function formatEvidence(evidence: any) {
  if (Array.isArray(evidence)) return evidence;
  if (!evidence) return [];
  return [String(evidence)];
}

export function AttestationWizard({ item, validatorWallet, canAct, onComplete }: AttestationWizardProps) {
  const { prepareAttestation, submitAttestation, revokeAttestation } = useValidationActions();
  const { signTypedDataAsync } = useSignTypedData();
  const [status, setStatus] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [message, setMessage] = useState("");
  const [score, setScore] = useState("");
  const [phase, setPhase] = useState<WizardPhase>("review");
  const [error, setError] = useState<WizardError | null>(null);
  const [attestationId, setAttestationId] = useState<string | null>(item.attestation?.id || null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const wrongWallet =
    validatorWallet && item.request.requestedValidatorWallet
      ? validatorWallet.toLowerCase() !== item.request.requestedValidatorWallet.toLowerCase()
      : false;

  const evidenceLinks = useMemo(() => formatEvidence(item.request.evidenceLinks), [item.request.evidenceLinks]);

  const executeAttestation = useCallback(
    async (actionStatus: "APPROVED" | "REJECTED") => {
      if (!canAct) {
        setError({ message: "Connect your wallet and sign in to attest." });
        return;
      }
      if (wrongWallet) {
        setError({ message: "Your connected wallet does not match the requested validator." });
        return;
      }
      setError(null);
      setPhase("preparing");
      try {
        const prepared = await prepareAttestation(item.request.id, {
          status: actionStatus,
          message: message.trim() || undefined,
          score: score ? Number(score) : undefined,
        });
        const typedData = prepared?.data?.typedData;
        const issuedAt = prepared?.data?.issuedAt;
        if (!typedData || !issuedAt) {
          throw new Error("Unable to prepare attestation. Please retry.");
        }
        setPhase("signing");
        const signature = await signTypedDataAsync({
          domain: typedData.domain,
          types: typedData.types,
          primaryType: typedData.primaryType,
          message: typedData.message,
        });
        setPhase("submitting");
        const submitResponse = await submitAttestation(item.request.id, {
          status: actionStatus,
          message: message.trim() || undefined,
          score: score ? Number(score) : undefined,
          signature,
          issuedAt,
        });
        const newAttestationId = submitResponse?.data?.attestation?.id || null;
        setAttestationId(newAttestationId);
        setPhase("done");
        uiToast.group(
          `attestation:${item.request.id}`,
          "success",
          actionStatus === "APPROVED" ? "Attestation submitted" : "Rejection submitted",
        );
        onComplete?.();
      } catch (e: any) {
        const normalized = normalizeError(e, e?.message);
        const retry = () => executeAttestation(actionStatus);
        setError({ message: normalized.message, retry });
        setPhase("review");
      }
    },
    [
      canAct,
      item.request.id,
      message,
      onComplete,
      prepareAttestation,
      score,
      signTypedDataAsync,
      submitAttestation,
      wrongWallet,
    ],
  );

  const runRevoke = async () => {
    if (!canAct) {
      setError({ message: "Connect your wallet and sign in to revoke." });
      return;
    }
    if (wrongWallet) {
      setError({ message: "Your connected wallet does not match the requested validator." });
      return;
    }
    setError(null);
    setPhase("revoking");
    try {
      const prepared = await prepareAttestation(item.request.id, {
        status: "REVOKED",
        message: message.trim() || undefined,
        score: undefined,
      });
      const typedData = prepared?.data?.typedData;
      const issuedAt = prepared?.data?.issuedAt;
      if (!typedData || !issuedAt) throw new Error("Unable to prepare revocation.");
      const signature = await signTypedDataAsync({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });
      await revokeAttestation(item.request.id, {
        signature,
        issuedAt,
        message: message.trim() || undefined,
      });
      setPhase("revoked");
      uiToast.group(`attestation-revoke:${item.request.id}`, "success", "Attestation revoked");
      onComplete?.();
    } catch (e: any) {
      const normalized = normalizeError(e, e?.message);
      setError({ message: normalized.message, retry: runRevoke });
      setPhase("done");
    }
  };

  const phaseLabel = (() => {
    switch (phase) {
      case "preparing":
        return "Preparing attestation";
      case "signing":
        return "Awaiting signature";
      case "submitting":
        return "Submitting attestation";
      case "revoking":
        return "Revoking attestation";
      default:
        return "Review request";
    }
  })();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1">
            <div className="text-lg font-semibold">{item.request.title}</div>
            {item.request.summary ? <div className="text-sm text-textMuted">{item.request.summary}</div> : null}
            <div className="text-xs text-textMuted">Request ID: {shortId(item.request.id)}</div>
          </div>
          <Badge variant="neutral">{item.request.status}</Badge>
        </CardHeader>
        <CardBody className="space-y-4">
          {evidenceLinks.length ? (
            <div className="space-y-2 text-sm">
              <div className="text-xs text-textMuted">Evidence</div>
              <ul className="space-y-1">
                {evidenceLinks.map((link) => (
                  <li key={link}>
                    {isLink(link) ? (
                      <a href={link} target="_blank" rel="noreferrer" className="text-accent hover:underline">
                        {link}
                      </a>
                    ) : (
                      <span className="text-text">{link}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {wrongWallet ? (
            <StatusBadge tone="danger">Wallet mismatch - connect the requested validator wallet.</StatusBadge>
          ) : null}
        </CardBody>
      </Card>

      {error ? <ErrorState message={error.message} onRetry={error.retry} /> : null}

      {phase === "preparing" || phase === "signing" || phase === "submitting" || phase === "revoking" ? (
        <LoadingState title={phaseLabel} description="This action requires a wallet signature." rows={2} />
      ) : null}

      <Card>
        <CardBody className="space-y-3">
          <div className="text-sm font-semibold">Attestation</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs text-textMuted">Decision</label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={status === "APPROVED" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setStatus("APPROVED")}
                  disabled={phase !== "review"}
                >
                  {UI_LABELS.approve}
                </Button>
                <Button
                  type="button"
                  variant={status === "REJECTED" ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setStatus("REJECTED")}
                  disabled={phase !== "review"}
                >
                  {UI_LABELS.reject}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-textMuted">Score (optional)</label>
              <Input
                type="number"
                min={1}
                max={100}
                value={score}
                onChange={(event) => setScore(event.target.value)}
                placeholder="Score 1-100"
                disabled={phase !== "review"}
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-textMuted">Message (optional)</label>
            <Textarea
              rows={3}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Add context for the claimant"
              disabled={phase !== "review"}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => executeAttestation(status)} disabled={phase !== "review"}>
              {UI_LABELS.submit} attestation
            </Button>
            {phase === "done" && attestationId ? (
              <Link href={`/verify/validation/${attestationId}`} className="text-xs text-accent hover:underline">
                View verification
              </Link>
            ) : null}
            {phase === "done" ? (
              <Button type="button" variant="ghost" onClick={() => setConfirmRevoke(true)}>
                Revoke attestation
              </Button>
            ) : null}
          </div>
          <div className="text-xs text-textMuted">
            If the network is degraded, verification may show as unknown. The attestation still records your signature.
          </div>
        </CardBody>
      </Card>

      {phase === "revoked" ? (
        <StatusBadge tone="warning">Attestation revoked. Verify the request state for confirmation.</StatusBadge>
      ) : null}

      <ConfirmDialog
        open={confirmRevoke}
        onClose={() => setConfirmRevoke(false)}
        onConfirm={() => {
          setConfirmRevoke(false);
          void runRevoke();
        }}
        title="Revoke attestation"
        description="This will mark the validation as revoked. Type REVOKE to confirm."
        confirmPhrase="REVOKE"
        confirmLabel="Revoke"
      />
    </div>
  );
}
