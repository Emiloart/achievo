/**
 * Organization creation page with on-chain gating.
 *
 * Flow: prepare → sign → confirm → finalize, with backend finalize only after tx hash/receipt.
 */
"use client";

import { useState } from "react";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWriteContract } from "wagmi";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { Badge, Button, ButtonLink, Card, CardBody, Section } from "../../components/ui";
import { getApiErrorMessage } from "../../lib/apiError";
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

type CreateStep = "idle" | "prepare" | "sign" | "confirm" | "finalize";

export default function OrgsPage() {
  const { token } = useBackendAuth();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { chains = [], switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const [searchHandle, setSearchHandle] = useState("");
  const [form, setForm] = useState<OrgForm>({
    handle: "",
    displayName: "",
    description: "",
    website: "",
    visibility: "PUBLIC",
  });
  const [createStep, setCreateStep] = useState<CreateStep>("idle");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [retryPayload, setRetryPayload] = useState<OrgFinalizePayload | null>(null);
  const [error, setError] = useState("");

  const statusLabel =
    createStep === "prepare"
      ? "Preparing..."
      : createStep === "sign"
        ? "Awaiting signature..."
        : createStep === "confirm"
          ? "Confirming on-chain transaction..."
          : createStep === "finalize"
            ? "Finalizing..."
            : "";

  const finalizeOrg = async (payload: OrgFinalizePayload) => {
    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(await getApiErrorMessage(res, "Unable to finalize the organization."));
    }
    return res.json();
  };

  const handleWalletError = (err: any) => {
    const message = (err?.shortMessage || err?.message || "").toString();
    if (message.toLowerCase().includes("user rejected") || message.toLowerCase().includes("rejected")) {
      return "Transaction cancelled.";
    }
    return message || "Transaction failed.";
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      setError("Sign in to create an organization.");
      return;
    }
    if (!form.handle.trim()) {
      setError("Enter an org handle to continue.");
      return;
    }
    if (!form.displayName.trim()) {
      setError("Enter a display name to continue.");
      return;
    }
    let submittedHash: string | null = null;
    let step: CreateStep = "prepare";
    const updateStep = (next: CreateStep) => {
      step = next;
      setCreateStep(next);
    };
    setError("");
    updateStep("prepare");
    setTxHash(null);
    setRetryPayload(null);
    try {
      const prepareRes = await fetch("/api/orgs/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          handle: form.handle,
        }),
      });
      if (!prepareRes.ok) throw new Error(await getApiErrorMessage(prepareRes, "Unable to prepare org creation."));
      const prepareJson = await prepareRes.json();
      const prepareData = (prepareJson?.data || {}) as OrgPreparePayload;
      const normalizedHandle = prepareData.handle || form.handle;
      if (!normalizedHandle) {
        throw new Error("Enter a valid handle before creating an organization.");
      }
      setForm((prev) => ({ ...prev, handle: normalizedHandle }));

      const requiresOnchain = Boolean(prepareData.required);
      let creationTxHash: string | undefined;
      const requiredChainId = Number(prepareData.chainId || 0);

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
        if (!Number.isFinite(requiredChainId) || requiredChainId <= 0) {
          throw new Error("Unable to determine the required network. Try again later.");
        }

        if (chainId !== requiredChainId) {
          const chainLabel = chains.find((chain) => chain.id === requiredChainId)?.name || "the required network";
          if (!switchChainAsync) {
            throw new Error(`Switch to ${chainLabel} to continue.`);
          }
          updateStep("prepare");
          await switchChainAsync({ chainId: requiredChainId });
        }

        updateStep("sign");
        const feeValue = BigInt(prepareData.fee);
        const hash = await writeContractAsync({
          address: prepareData.registry,
          abi: orgRegistryAbi,
          functionName: "createOrg",
          args: [normalizedHandle],
          value: feeValue,
          chainId: requiredChainId,
        });
        creationTxHash = hash;
        submittedHash = hash;
        setTxHash(hash);

        if (!publicClient) {
          throw new Error("Wallet client not available. Please retry.");
        }
        updateStep("confirm");
        const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });
        if (!receipt || receipt.status !== "success") {
          throw new Error("Transaction failed. Please try again.");
        }
      }

      updateStep("finalize");
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
      if (step === "sign") {
        setError(handleWalletError(e));
      } else if (step === "finalize" && submittedHash) {
        setError("Transaction confirmed, but syncing failed. Retry sync to finish.");
        setRetryPayload({
          handle: form.handle,
          displayName: form.displayName,
          description: form.description || undefined,
          website: form.website || undefined,
          visibility: form.visibility,
          creationTxHash: submittedHash,
        });
      } else {
        setError(e?.message || "Unable to create the organization.");
      }
    } finally {
      updateStep("idle");
    }
  };

  const handleRetrySync = async () => {
    if (!retryPayload) return;
    setError("");
    setCreateStep("finalize");
    try {
      const json = await finalizeOrg(retryPayload);
      const handle = json?.data?.handle || retryPayload.handle;
      window.location.href = `/orgs/${handle}`;
    } catch (e: any) {
      setError(e?.message || "Unable to sync the organization.");
    } finally {
      setCreateStep("idle");
    }
  };

  return (
    <div className="space-y-8">
      <Section title="Organizations" description="Discover or create a workspace for your team, program, or community.">
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
              {error && <div className="text-xs text-danger">{error}</div>}
              {statusLabel && (
                <div className="text-xs text-muted-foreground">
                  {statusLabel}
                  {txHash ? ` (${txHash.slice(0, 10)}...)` : ""}
                </div>
              )}
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
                <Button type="submit" disabled={createStep !== "idle" || isSwitching} className="md:col-span-2">
                  {createStep !== "idle" || isSwitching ? "Creating..." : "Create org"}
                </Button>
              </form>
              {retryPayload ? (
                <Button variant="secondary" onClick={handleRetrySync} disabled={createStep !== "idle"}>
                  Retry sync
                </Button>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </Section>
    </div>
  );
}
