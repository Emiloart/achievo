"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { coreAddress, coreAbi } from "../../lib/contracts";
import toast from "react-hot-toast";
import { PageHeader } from "../../components/nav/PageHeader";
import { LoadingState } from "../../components/states/LoadingState";
import { TxStepper } from "../../components/tx/TxStepper";
import { useTxLifecycle } from "../../components/tx/useTxLifecycle";

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
  const tx = useTxLifecycle(1);

  const approve = async () => {
    if (goalId === undefined) return toast.error("Enter a valid goal id");
    try {
      tx.reset();
      const result = await tx.submit(() =>
        writeContractAsync({ address: coreAddress, abi: coreAbi, functionName: "approve", args: [goalId] }),
      );
      if (result.status === "confirmed") {
        toast.success("Approval confirmed");
        return;
      }
      if (result.error?.message) {
        toast.error(result.error.message);
        return;
      }
      toast.error("Approval failed");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed");
    }
  };

  const isCreator = goalData && address && goalData.creator.toLowerCase() === address.toLowerCase();
  const restricted = Boolean(goalData?.peersRestricted);
  const canApprove =
    goalId !== undefined && goalData && address && !isCreator && !dismissed && (!restricted || Boolean(isAllowed));

  return (
    <div className="space-y-6">
      <PageHeader title="Approve a goal" description="Review a goal and submit your on-chain approval." />
      <div className="flex items-center gap-2">
        <input
          value={goalIdInput}
          onChange={(e) => setGoalIdInput(e.target.value)}
          placeholder="Goal ID"
          className="rounded-md border px-3 py-2"
        />
        <button className="px-4 py-2 rounded-md border" onClick={() => refetch()}>
          Load
        </button>
          {canApprove ? (
          <>
            <button
              disabled={isPending || tx.state !== "idle"}
              className="px-4 py-2 rounded-md bg-brand-600 text-white"
              onClick={approve}
            >
              {tx.state !== "idle" ? "Submitting..." : "Approve"}
            </button>
            <button className="px-4 py-2 rounded-md border text-sm" onClick={() => setDismissed(true)}>
              Ignore
            </button>
          </>
        ) : null}
      </div>

      {goalData ? (
        <div className="rounded-xl border bg-white p-5 space-y-2">
          <div className="text-sm text-gray-600">Creator</div>
          <div className="font-mono text-sm">{goalData.creator}</div>
          <div className="text-sm text-gray-600">Approvals</div>
          <div className="flex items-center gap-3">
            <div className="w-40 h-2 bg-gray-200 rounded-full overflow-hidden">
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
          <div className="text-sm text-gray-600">Level</div>
          <div className="font-semibold">{["NONE", "SELF", "PEER", "AUTO"][goalData.level]}</div>
          <div className="text-sm text-gray-600">Verified</div>
          <div>{goalData.verified ? "Yes" : "No"}</div>
          {restricted && !isAllowed && (
            <div className="text-xs text-red-500">You are not on the peer allowlist for this goal.</div>
          )}
          {isCreator && <div className="text-xs text-gray-500">Creators should self-approve from the dashboard.</div>}
        </div>
      ) : null}

      {tx.state !== "idle" || tx.error ? <TxStepper state={tx.state} txHash={tx.txHash} error={tx.error} /> : null}
      {tx.state === "finalized" && tx.txHash ? (
        <div className="rounded-md border bg-white p-4">
          <div className="font-medium">Tx: {tx.txHash}</div>
        </div>
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
