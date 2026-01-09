"use client";
import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { coreAddress, coreAbi } from "../../../lib/contracts";
import toast from "react-hot-toast";
import { uploadFile, uploadJSON } from "../../../lib/ipfs";
import { isAddress } from "viem";

export default function CreateGoalPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [peerInput, setPeerInput] = useState("");
  const [restrictPeers, setRestrictPeers] = useState(false);
  const [goalCID, setGoalCID] = useState("");
  const { data: hash, writeContractAsync, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let imageUri: string | undefined;
      if (imageFile) {
        const up = await uploadFile(imageFile);
        imageUri = up.uri;
      }
      const goalJson = {
        title,
        description,
        image: imageUri,
        createdAt: Math.floor(Date.now() / 1000),
      };
      const upGoal = await uploadJSON(goalJson);
      setGoalCID(upGoal.uri);
      const peers = peerInput
        .split(/[\n,]+/g)
        .map((p) => p.trim())
        .filter(Boolean);
      const formattedPeers = peers.map((peer) => {
        if (!isAddress(peer)) {
          throw new Error(`Invalid address: ${peer}`);
        }
        return peer as `0x${string}`;
      });
      if (!restrictPeers && formattedPeers.length > 0) {
        throw new Error("Enable the restriction toggle to use a peer allow list");
      }
      if (restrictPeers) {
        if (formattedPeers.length === 0) {
          throw new Error("Add at least one peer address when restricting approvals");
        }
        await writeContractAsync({
          address: coreAddress,
          abi: coreAbi,
          functionName: "createGoalWithPeers",
          args: [upGoal.uri, formattedPeers, true],
        });
      } else {
        await writeContractAsync({
          address: coreAddress,
          abi: coreAbi,
          functionName: "createGoal",
          args: [upGoal.uri],
        });
      }
      toast.success("Goal transaction submitted");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Create Goal</h2>
      <form onSubmit={onSubmit} className="space-y-3 max-w-xl">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full rounded-md border px-3 py-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full rounded-md border px-3 py-2"
        />
        <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
        <textarea
          value={peerInput}
          onChange={(e) => setPeerInput(e.target.value)}
          placeholder="Peer addresses (0x...) separated by commas or new lines"
          className="w-full rounded-md border px-3 py-2 text-sm"
          rows={3}
        />
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={restrictPeers} onChange={(e) => setRestrictPeers(e.target.checked)} />
          Restrict peer approvals to the listed addresses
        </label>
        <p className="text-xs text-gray-500">
          When enabled, only the specified peers will be able to approve this goal.
        </p>
        <button disabled={isPending} className="px-4 py-2 rounded-md bg-brand-600 text-white">
          {isPending ? "Submitting..." : "Create"}
        </button>
      </form>
      {receipt.data && (
        <div className="rounded-md border bg-white p-4">
          <div className="font-medium">Tx: {hash}</div>
          <div className="text-sm text-gray-600 break-all">Goal CID: {goalCID}</div>
          <div className="text-sm text-gray-600">Check your goal with the latest ID on the home page.</div>
        </div>
      )}
    </div>
  );
}
