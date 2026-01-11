/**
 * Organization creation page with on-chain gating.
 *
 * Flow: prepare → sign → confirm → finalize, with backend finalize only after tx hash/receipt.
 */
"use client";

import { useState } from "react";
import { useAccount, useChainId, useSwitchChain, useWriteContract } from "wagmi";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { PageHeader } from "../../components/nav/PageHeader";
import { AuthRequired } from "../../components/states/AuthRequired";
import { ChainRequired } from "../../components/states/ChainRequired";
import { ErrorState } from "../../components/states/ErrorState";
import { TxStepper } from "../../components/tx/TxStepper";
import { useTxLifecycle } from "../../components/tx/useTxLifecycle";
import { Badge, Button, ButtonLink, Card, CardBody, Section } from "../../components/ui";
import { getApiError } from "../../lib/apiError";
import { orgRegistryAbi } from "../../lib/contracts";

type OrgForm = {
  handle: string;
  displayName: string;
  description: string;
  website: string;
  visibility: string;
};

type OrgPreparePayload = {
  required?: boolean;
  chainId?: number;
  registry?: `0x${string}` | null;
  fee?: string | null;
  rules?: Record<string, unknown> | null;
  handle?: string | null;
  handleHash?: string | null;
};

type OrgFinalizePayload = {
  handle: string;
  displayName: string;
  description?: string;
  website?: string;
  visibility?: string;
  creationTxHash?: string;
};

export default function OrgsPage() {
  const { token } = useBackendAuth();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { chains = [], switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const tx = useTxLifecycle(1);
  const [searchHandle, setSearchHandle] = useState("");
  const [form, setForm] = useState<OrgForm>({
    handle: "",
    displayName: "",
    description: "",
    website: "",
    visibility: "PUBLIC",
  });
  const [finalizing, setFinalizing] = useState(false);
  const [retryPayload, setRetryPayload] = useState<OrgFinalizePayload | null>(null);
  const [error, setError] = useState<{ message: string; requestId?: string | null } | null>(null);
  const [requiredChainId, setRequiredChainId] = useState<number | null>(null);
  const [requiredChainLabel, setRequiredChainLabel] = useState<string | null>(null);

  const statusLabel = finalizing ? "Finalizing..." : "";
  const txBusy = tx.state === "walletPrompt" || tx.state === "submitted" || tx.state === "confirming";
  const isBusy = isSwitching || finalizing || txBusy;

  const finalizeOrg = async (payload: OrgFinalizePayload) => {
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const { message, requestId } = await getApiError(res, "Unable to finalize the organization.");
      const err = new Error(message);
      (err as { requestId?: string | null }).requestId = requestId;
      throw err;
    }
    return res.json();
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError({ message: "Sign in to create an organization." });
      return;
    }
    if (!form.handle.trim()) {
      setError({ message: "Enter an org handle to continue." });
      return;
    }
    if (!form.displayName.trim()) {
      setError({ message: "Enter a display name to continue." });
      return;
    }

    let normalizedHandle = form.handle;
    let creationTxHash: string | undefined;

    setError(null);
    setRetryPayload(null);
    setFinalizing(false);
    setRequiredChainId(null);
    setRequiredChainLabel(null);
    tx.reset();

    try {
      const prepareRes = await fetch("/api/orgs/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          handle: form.handle,
        }),
      });
      if (!prepareRes.ok) {
        const { message, requestId } = await getApiError(prepareRes, "Unable to prepare org creation.");
        const err = new Error(message);
        (err as { requestId?: string | null }).requestId = requestId;
        throw err;
      }
      const prepareJson = await prepareRes.json();
      const prepareData = (prepareJson?.data || {}) as OrgPreparePayload;
      normalizedHandle = prepareData.handle || form.handle;
      if (!normalizedHandle) {
          throw new Error("Enter a valid handle before creating an organization.");
      }
      setForm((prev) => ({ ...prev, handle: normalizedHandle }));

      const requiresOnchain = Boolean(prepareData.required);
      const requiredChain = Number(prepareData.chainId || 0);
      if (requiresOnchain) {
        if (!isConnected || !address) {
          throw new Error("Connect your wallet to create an organization.");
        }
        if (!prepareData.registry) {
          throw new Error("Org registry is not configured. Try again later.");
        }
        if (prepareData.fee === null || prepareData.fee === undefined) {
          throw new Error("Unable to fetch the org creation fee. Please try again.");
        }
        if (!Number.isFinite(requiredChain) || requiredChain <= 0) {
          throw new Error("Unable to determine the required network. Try again later.");
        }

        const chainLabel = chains.find((chain) => chain.id === requiredChain)?.name || "the required network";
        setRequiredChainId(requiredChain);
        setRequiredChainLabel(chainLabel);

        if (chainId !== requiredChain) {
          if (!switchChainAsync) {
            throw new Error(`Switch to ${chainLabel} to continue.`);
          }
          await switchChainAsync({ chainId: requiredChain });
        }

        const feeValue = BigInt(prepareData.fee);
        const result = await tx.submit(() =>
          writeContractAsync({
            address: prepareData.registry,
            abi: orgRegistryAbi,
            functionName: "createOrg",
            args: [normalizedHandle],
            value: feeValue,
            chainId: requiredChain,
          }),
        );
        const submittedHash = result.txHash || null;
        if (result.status !== "confirmed" || !submittedHash) {
          if (result.status === "rejected") {
          setError({ message: "Transaction cancelled." });
          return;
        }
        if (result.error?.message) {
          setError({ message: result.error.message });
          return;
        }
        setError({ message: "Transaction failed." });
        return;
      }
        creationTxHash = submittedHash;
      }

      setFinalizing(true);
      const payload: OrgFinalizePayload = {
        handle: normalizedHandle,
        displayName: form.displayName,
        description: form.description || undefined,
        website: form.website || undefined,
        visibility: form.visibility,
        creationTxHash: creationTxHash,
      };
      const json = await finalizeOrg(payload);
      const handle = json?.data?.handle || normalizedHandle;
      window.location.href = `/orgs/${handle}`;
    } catch (e: any) {
      if (creationTxHash) {
        setError({ message: "Transaction confirmed, but syncing failed. Retry sync to finish." });
        setRetryPayload({
          handle: form.handle,
          displayName: form.displayName,
          description: form.description || undefined,
          website: form.website || undefined,
          visibility: form.visibility,
          creationTxHash: creationTxHash,
        });
      } else {
        setError({ message: e?.message || "Unable to create the organization.", requestId: e?.requestId });
      }
    } finally {
      setFinalizing(false);
    }
  };

  const handleRetrySync = async () => {
    if (!retryPayload) return;
    setError(null);
    setFinalizing(true);
    try {
      const json = await finalizeOrg(retryPayload);
      const handle = json?.data?.handle || retryPayload.handle;
      window.location.href = `/orgs/${handle}`;
    } catch (e: any) {
      setError({ message: e?.message || "Unable to sync the organization.", requestId: e?.requestId });
    } finally {
      setFinalizing(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Organizations"
        description="Discover or create a workspace for your team, program, or community."
      />
      {!token ? (
        <AuthRequired
          title="Sign in to create an organization"
          description="Connect your wallet and sign in before submitting the on-chain transaction."
        />
      ) : null}
      <Section title="Find or create" description="Look up an existing org or create a new workspace.">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardBody className="space-y-4">
              <div className="text-sm font-semibold">Find an organization</div>
              <div className="flex flex-wrap gap-3 items-center">
                <input
                  value={searchHandle}
                  onChange={(e) => setSearchHandle(e.target.value)}
                  placeholder="org-handle"
                  className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
                />
                <ButtonLink href={searchHandle ? `/orgs/${searchHandle.toLowerCase()}` : "#"} variant="secondary">
                  View org
                </ButtonLink>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Create a new org</div>
                {form.visibility && <Badge variant="neutral">{form.visibility}</Badge>}
              </div>
              {requiredChainId ? (
                <ChainRequired requiredChainId={requiredChainId} requiredChainLabel={requiredChainLabel || undefined} />
              ) : null}
              {error ? (
                <ErrorState
                  message={error.message}
                  requestId={error.requestId}
                  onRetry={retryPayload ? handleRetrySync : undefined}
                  retryLabel={retryPayload ? "Retry sync" : undefined}
                />
              ) : null}
              {statusLabel && (
                <div className="text-xs text-muted-foreground">
                  {statusLabel}
                  {tx.txHash ? ` (${tx.txHash.slice(0, 10)}...)` : ""}
                </div>
              )}
              {tx.state !== "idle" || tx.error ? <TxStepper state={tx.state} txHash={tx.txHash} error={tx.error} /> : null}
              <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
                <input
                  value={form.handle}
                  onChange={(e) => setForm({ ...form, handle: e.target.value })}
                  placeholder="Handle (lowercase)"
                  className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
                />
                <input
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                  placeholder="Display name"
                  className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
                />
                <input
                  value={form.website}
                  onChange={(e) => setForm({ ...form, website: e.target.value })}
                  placeholder="Website"
                  className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
                />
                <select
                  value={form.visibility}
                  onChange={(e) => setForm({ ...form, visibility: e.target.value })}
                  className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm"
                >
                  <option value="PUBLIC">Public</option>
                  <option value="UNLISTED">Unlisted</option>
                  <option value="PRIVATE">Private</option>
                </select>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Description"
                  className="rounded-2xl border border-border bg-surface px-3 py-2 text-sm md:col-span-2"
                  rows={3}
                />
                <Button type="submit" disabled={isBusy || !token} className="md:col-span-2">
                  {isBusy ? "Creating..." : "Create org"}
                </Button>
              </form>
            </CardBody>
          </Card>
        </div>
      </Section>
    </div>
  );
}
