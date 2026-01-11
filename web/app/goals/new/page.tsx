"use client";
import { useState } from "react";
import { useWriteContract } from "wagmi";
import { coreAddress, coreAbi } from "../../../lib/contracts";
import toast from "react-hot-toast";
import { uploadFile, uploadJSON } from "../../../lib/ipfs";
import { isAddress } from "viem";
import { PageHeader } from "../../../components/nav/PageHeader";
import { TxStepper } from "../../../components/tx/TxStepper";
import { useTxLifecycle } from "../../../components/tx/useTxLifecycle";

export default function CreateGoalPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [peerInput, setPeerInput] = useState("");
  const [restrictPeers, setRestrictPeers] = useState(false);
  const [goalCID, setGoalCID] = useState("");
  const { writeContractAsync, isPending } = useWriteContract();
  const tx = useTxLifecycle(1);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    tx.reset();
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
      const submit = async () => {
        if (restrictPeers) {
          if (formattedPeers.length === 0) {
            throw new Error("Add at least one peer address when restricting approvals");
          }
          return writeContractAsync({
            address: coreAddress,
            abi: coreAbi,
            functionName: "createGoalWithPeers",
            args: [upGoal.uri, formattedPeers, true],
          });
        }
        return writeContractAsync({
          address: coreAddress,
          abi: coreAbi,
          functionName: "createGoal",
          args: [upGoal.uri],
        });
      };
      const result = await tx.submit(submit);
      if (result.status === "confirmed") {
        toast.success("Goal confirmed on-chain");
        return;
      }
      if (result.error?.message) {
        toast.error(result.error.message);
        return;
      }
      toast.error("Transaction failed");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Create goal" description="Anchor a new goal on-chain and invite peers to approve." />
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
        <button disabled={isPending || tx.state !== "idle"} className="px-4 py-2 rounded-md bg-brand-600 text-white">
          {isPending || tx.state !== "idle" ? "Submitting..." : "Create"}
        </button>
      </form>
      {tx.state !== "idle" || tx.error ? <TxStepper state={tx.state} txHash={tx.txHash} error={tx.error} /> : null}
      {tx.state === "finalized" && tx.txHash ? (
        <div className="rounded-md border bg-white p-4">
          <div className="font-medium">Tx: {tx.txHash}</div>
          <div className="text-sm text-gray-600 break-all">Goal CID: {goalCID}</div>
          <div className="text-sm text-gray-600">Check your goal with the latest ID on the home page.</div>
        </div>
      ) : null}
    </div>
  );
}
