"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useAccount, useSignTypedData } from "wagmi";
import { useBackendAuth } from "../../../hooks/useBackendAuth";
import { useValidatorRequests, useValidationActions, type ValidationItem } from "../../../hooks/useValidations";
import { Badge, Button, Card, CardBody, CardHeader, Section, uiToast } from "../../../components/ui";

type RequestState = {
  message: string;
  score: string;
};

function isLink(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function shortId(value: string) {
  if (!value) return "";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function formatEvidence(evidence: any) {
  if (Array.isArray(evidence)) return evidence;
  if (!evidence) return [];
  return [String(evidence)];
}

function renderClaimant(item: ValidationItem) {
  const claimant = item.claimant || {};
  if (claimant.displayName || claimant.achusrId) {
    return (
      <div className="text-sm text-textMuted">
        {claimant.displayName || claimant.achusrId}{" "}
        {claimant.username ? `(@${claimant.username.replace(/^@/, "")})` : ""}
      </div>
    );
  }
  return <div className="text-sm text-textMuted">Claimant {item.request.claimantUserId}</div>;
}

export default function ValidatorInboxPage() {
  const { address } = useAccount();
  const { token } = useBackendAuth();
  const { items, loading, error, refetch } = useValidatorRequests(address);
  const { prepareAttestation, submitAttestation } = useValidationActions();
  const { signTypedDataAsync } = useSignTypedData();
  const [requestState, setRequestState] = useState<Record<string, RequestState>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const canAct = Boolean(address && token);

  const handleAction = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    if (!address) {
      uiToast.error("Connect your wallet to sign");
      return;
    }
    if (!token) {
      uiToast.error("Sign in to backend first");
      return;
    }
    setBusyId(requestId);
    try {
      const state = requestState[requestId] || { message: "", score: "" };
      const message = state.message.trim();
      const scoreValue = state.score ? Number(state.score) : NaN;
      const score = Number.isFinite(scoreValue) ? Math.floor(scoreValue) : undefined;

      const prepared = await prepareAttestation(requestId, {
        status,
        message: message || undefined,
        score,
      });
      const typedData = prepared?.data?.typedData;
      const issuedAt = prepared?.data?.issuedAt;
      if (!typedData || !issuedAt) throw new Error("Unable to prepare attestation");

      const signature = await signTypedDataAsync({
        domain: typedData.domain,
        types: typedData.types,
        primaryType: typedData.primaryType,
        message: typedData.message,
      });

      await submitAttestation(requestId, {
        status,
        message: message || undefined,
        score,
        signature,
        issuedAt,
      });
      uiToast.success(status === "APPROVED" ? "Validation approved" : "Validation rejected");
      setRequestState((prev) => ({ ...prev, [requestId]: { message: "", score: "" } }));
      await refetch();
    } catch (e: any) {
      uiToast.error(e?.message || "Failed to submit validation");
    } finally {
      setBusyId(null);
    }
  };

  const requests = useMemo(() => items || [], [items]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Section
        title="Validator inbox"
        description="Review validation requests addressed to your wallet. You will sign an EIP-712 message to approve or reject."
      >
        {!canAct && (
          <div className="text-xs text-warning">
            Connect your wallet and sign in to view pending requests. Go to{" "}
            <Link href="/identity" className="underline">
              Identity
            </Link>{" "}
            if you need to sign in.
          </div>
        )}
      </Section>

      {loading ? (
        <div className="text-sm text-textMuted">Loading requests...</div>
      ) : error ? (
        <div className="text-sm text-danger">{error}</div>
      ) : requests.length ? (
        <div className="space-y-4">
          {requests.map((item) => {
            const state = requestState[item.request.id] || { message: "", score: "" };
            const evidenceLinks = formatEvidence(item.request.evidenceLinks);
            const disabled = busyId === item.request.id;
            return (
              <Card key={item.request.id}>
                <CardHeader className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <div className="text-lg font-semibold">{item.request.title}</div>
                    {item.request.summary && <div className="text-sm text-textMuted">{item.request.summary}</div>}
                    {renderClaimant(item)}
                    <div className="text-xs text-textMuted">
                      Request ID: <span className="font-mono">{shortId(item.request.id)}</span>
                    </div>
                  </div>
                  <Badge variant="neutral">{item.request.status}</Badge>
                </CardHeader>
                <CardBody className="space-y-4">
                  {evidenceLinks.length > 0 && (
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
                  )}

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs text-textMuted">Message (optional)</label>
                      <textarea
                        className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
                        rows={3}
                        value={state.message}
                        onChange={(e) =>
                          setRequestState((prev) => ({
                            ...prev,
                            [item.request.id]: { ...state, message: e.target.value },
                          }))
                        }
                        placeholder="Add context for this attestation"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-textMuted">Score (1-100, optional)</label>
                      <input
                        className="w-full rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
                        type="number"
                        min={1}
                        max={100}
                        value={state.score}
                        onChange={(e) =>
                          setRequestState((prev) => ({
                            ...prev,
                            [item.request.id]: { ...state, score: e.target.value },
                          }))
                        }
                        placeholder="Score"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button onClick={() => handleAction(item.request.id, "APPROVED")} disabled={!canAct || disabled}>
                      {disabled ? "Signing..." : "Approve"}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleAction(item.request.id, "REJECTED")}
                      disabled={!canAct || disabled}
                    >
                      {disabled ? "Signing..." : "Reject"}
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-textMuted">No pending validation requests.</div>
      )}
    </div>
  );
}
