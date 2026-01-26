"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useChainId, useReadContract, useWriteContract } from "wagmi";
import { coreAddress, coreAbi } from "../../lib/contracts";
import { PageHeader } from "../../components/nav/PageHeader";
import { LoadingState } from "../../components/states/LoadingState";
import { TxStepper } from "../../components/tx/TxStepper";
import { FinalityTimeline } from "../../components/tx/FinalityTimeline";
import { useTxLifecycle } from "../../components/tx/useTxLifecycle";
import { Button, Card, CardBody, Input, uiToast } from "../../components/ui";

function ApproveClient() {
  const params = useSearchParams();
  const [goalIdInput, setGoalIdInput] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    const q = params.get("goalId");
    if (q) setGoalIdInput(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setDismissed(false);
  }, [goalIdInput]);

  const goalId = (() => {
    try {
      return goalIdInput ? BigInt(goalIdInput) : undefined;
    } catch {
      return undefined;
    }
  })();

  const { data: goal, refetch } = useReadContract({
    address: coreAddress,
    abi: coreAbi,
    functionName: "getGoal",
    args: goalId !== undefined ? [goalId] : undefined,
    query: { enabled: goalId !== undefined },
  });
  const goalData = goal as any;

  const { data: threshold } = useReadContract({ address: coreAddress, abi: coreAbi, functionName: "peerThreshold" });

  const { data: isAllowed } = useReadContract({
    address: coreAddress,
    abi: coreAbi,
    functionName: "isPeerAllowed",
    args: goalId !== undefined && address ? [goalId, address as `0x${string}`] : undefined,
    query: { enabled: Boolean(goalId !== undefined && goalData && address) },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();
  const tx = useTxLifecycle(1);

  const approve = async () => {
    if (goalId === undefined) return uiToast.group("goal-approve", "error", "Enter a valid goal id");
    try {
      tx.reset();
      const result = await tx.submit(() =>
        writeContractAsync({ address: coreAddress, abi: coreAbi, functionName: "approve", args: [goalId] }),
      );
      if (result.status === "confirmed") {
        uiToast.group("goal-approve", "success", "Approval confirmed");
        return;
      }
      if (result.error?.message) {
        uiToast.group("goal-approve", "error", result.error.message);
        return;
      }
      uiToast.group("goal-approve", "error", "Approval failed");
    } catch (e: any) {
      uiToast.group("goal-approve", "error", e?.shortMessage || e?.message || "Failed");
    }
  };

  const isCreator = goalData && address && goalData.creator.toLowerCase() === address.toLowerCase();
  const restricted = Boolean(goalData?.peersRestricted);
  const canApprove =
    goalId !== undefined && goalData && address && !isCreator && !dismissed && (!restricted || Boolean(isAllowed));

  return (
    <div className="space-y-6">
      <PageHeader title="Approve a goal" description="Review a goal and submit your on-chain approval." />
      <div className="flex flex-wrap items-center gap-2">
        <Input value={goalIdInput} onChange={(e) => setGoalIdInput(e.target.value)} placeholder="Goal ID" />
        <Button type="button" variant="secondary" onClick={() => refetch()}>
          Load
        </Button>
        {canApprove ? (
          <>
            <Button disabled={isPending || tx.state !== "idle"} onClick={approve}>
              {tx.state !== "idle" ? "Submitting..." : "Approve"}
            </Button>
            <Button variant="ghost" type="button" onClick={() => setDismissed(true)}>
              Ignore
            </Button>
          </>
        ) : null}
      </div>

      {goalData ? (
        <Card>
          <CardBody className="space-y-2">
            <div className="text-sm text-textMuted">Creator</div>
            <div className="font-mono text-sm">{goalData.creator}</div>
            <div className="text-sm text-textMuted">Approvals</div>
            <div className="flex items-center gap-3">
              <div className="w-40 h-2 bg-surface2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600"
                  style={{
                    width: `${Math.min(100, Math.floor((Number(goalData.approvals) / Math.max(1, Number(threshold || 1))) * 100))}%`,
                  }}
                />
              </div>
              <div className="text-sm">
                {Number(goalData.approvals)}/{Number(threshold || 0)}
              </div>
            </div>
            <div className="text-sm text-textMuted">Level</div>
            <div className="font-semibold">{["NONE", "SELF", "PEER", "AUTO"][goalData.level]}</div>
            <div className="text-sm text-textMuted">Verified</div>
            <div>{goalData.verified ? "Yes" : "No"}</div>
            {restricted && !isAllowed && (
              <div className="text-xs text-danger">You are not on the peer allowlist for this goal.</div>
            )}
            {isCreator && (
              <div className="text-xs text-textMuted">Creators should self-approve from the dashboard.</div>
            )}
          </CardBody>
        </Card>
      ) : null}

      {tx.state !== "idle" || tx.error ? <TxStepper state={tx.state} txHash={tx.txHash} error={tx.error} /> : null}
      {tx.state !== "idle" || tx.error ? (
        <FinalityTimeline state={tx.state} txHash={tx.txHash} chainId={chainId || undefined} />
      ) : null}
      {tx.state === "finalized" && tx.txHash ? (
        <Card>
          <CardBody className="text-sm">
            <div className="font-medium">Tx: {tx.txHash}</div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

export default function ApprovePage() {
  return (
    <Suspense fallback={<LoadingState title="Loading approval flow" description="Preparing on-chain approval." />}>
      <ApproveClient />
    </Suspense>
  );
}
