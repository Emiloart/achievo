"use client";
import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import toast from "react-hot-toast";
import { coreAddress, coreAbi } from "../lib/contracts";
import { uploadFile, uploadJSON } from "../lib/ipfs";
import type { GoalStruct } from "../hooks/useRecentGoals";

interface Props {
  goal: GoalStruct;
}

export function GoalOwnerPanel({ goal }: Props) {
  const { address } = useAccount();
  const isOwner = address && goal.creator.toLowerCase() === address.toLowerCase();
  const [evidenceText, setEvidenceText] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const { writeContractAsync, isPending } = useWriteContract();
  const { data: hasApproved } = useReadContract({
    address: coreAddress,
    abi: coreAbi,
    functionName: "isApprovedBy",
    args: isOwner ? [goal.id, address as `0x${string}`] : undefined,
    query: { enabled: Boolean(isOwner) },
  });

  if (!isOwner) return null;

  const submitEvidence = async () => {
    try {
      let mediaUri: string | undefined;
      if (evidenceFile) {
        const upFile = await uploadFile(evidenceFile);
        mediaUri = upFile.uri;
      }
      const payload = {
        description: evidenceText,
        attachments: mediaUri ? [{ uri: mediaUri }] : [],
        submittedAt: Math.floor(Date.now() / 1000),
      };
      const stored = await uploadJSON(payload);
      await writeContractAsync({
        address: coreAddress,
        abi: coreAbi,
        functionName: "submitProof",
        args: [goal.id, stored.uri],
      });
      setEvidenceText("");
      setEvidenceFile(null);
      toast.success("Evidence uploaded");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to submit evidence");
    }
  };

  const selfVerify = async () => {
    try {
      await writeContractAsync({ address: coreAddress, abi: coreAbi, functionName: "selfVerify", args: [goal.id] });
      toast.success("Self verification submitted");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to self verify");
    }
  };

  const selfApprove = async () => {
    try {
      await writeContractAsync({ address: coreAddress, abi: coreAbi, functionName: "approve", args: [goal.id] });
      toast.success("Creator approval submitted");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed to approve");
    }
  };
  const canSelfVerify = !goal.verified;
  const creatorApproved = Boolean(hasApproved);

  return (
    <div className="rounded-2xl border bg-white p-4 space-y-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold text-gray-700">Evidence</div>
        <textarea
          value={evidenceText}
          onChange={(e) => setEvidenceText(e.target.value)}
          placeholder="Describe the proof you're uploading"
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={3}
        />
        <input
          type="file"
          accept="image/*,application/pdf"
          onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          onClick={submitEvidence}
          disabled={isPending}
          className="px-3 py-1.5 rounded-md border text-sm bg-white"
        >
          Upload Evidence
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={selfVerify}
          disabled={isPending || !canSelfVerify}
          className="px-4 py-2 rounded-md bg-brand-600 text-white text-sm disabled:opacity-50"
        >
          {canSelfVerify ? "Self Verify" : "Self Verified"}
        </button>
        <button
          type="button"
          onClick={selfApprove}
          disabled={isPending || creatorApproved}
          className="px-4 py-2 rounded-md border text-sm disabled:opacity-50"
        >
          {creatorApproved ? "Creator Approved" : "Self Approve"}
        </button>
      </div>
    </div>
  );
}
