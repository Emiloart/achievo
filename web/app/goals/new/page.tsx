"use client";
import { useState } from "react";
import { useChainId, useWriteContract } from "wagmi";
import { coreAddress, coreAbi } from "../../../lib/contracts";
import { uploadFile, uploadJSON } from "../../../lib/ipfs";
import { isAddress } from "viem";
import { PageHeader } from "../../../components/nav/PageHeader";
import { TxStepper } from "../../../components/tx/TxStepper";
import { FinalityTimeline } from "../../../components/tx/FinalityTimeline";
import { useTxLifecycle } from "../../../components/tx/useTxLifecycle";
import { Button, Card, CardBody, Checkbox, Input, Textarea, uiToast } from "../../../components/ui";

export default function CreateGoalPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [peerInput, setPeerInput] = useState("");
  const [restrictPeers, setRestrictPeers] = useState(false);
  const [goalCID, setGoalCID] = useState("");
  const { writeContractAsync, isPending } = useWriteContract();
  const chainId = useChainId();
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
        uiToast.group("goal-create", "success", "Goal confirmed on-chain");
        return;
      }
      if (result.error?.message) {
        uiToast.group("goal-create", "error", result.error.message);
        return;
      }
      uiToast.group("goal-create", "error", "Transaction failed");
    } catch (e: any) {
      uiToast.group("goal-create", "error", e?.shortMessage || e?.message || "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Create goal" description="Anchor a new goal on-chain and invite peers to approve." />
      <Card>
        <CardBody className="space-y-3 max-w-xl">
          <form onSubmit={onSubmit} className="space-y-3">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
            <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
            <Textarea
              value={peerInput}
              onChange={(e) => setPeerInput(e.target.value)}
              placeholder="Peer addresses (0x...) separated by commas or new lines"
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm text-text">
              <Checkbox checked={restrictPeers} onChange={(e) => setRestrictPeers(e.target.checked)} />
              Restrict peer approvals to the listed addresses
            </label>
            <p className="text-xs text-textMuted">
              When enabled, only the specified peers will be able to approve this goal.
            </p>
            <Button type="submit" disabled={isPending || tx.state !== "idle"}>
              {isPending || tx.state !== "idle" ? "Submitting..." : "Create"}
            </Button>
          </form>
        </CardBody>
      </Card>
      {tx.state !== "idle" || tx.error ? <TxStepper state={tx.state} txHash={tx.txHash} error={tx.error} /> : null}
      {tx.state !== "idle" || tx.error ? (
        <FinalityTimeline state={tx.state} txHash={tx.txHash} chainId={chainId || undefined} />
      ) : null}
      {tx.state === "finalized" && tx.txHash ? (
        <Card>
          <CardBody className="space-y-1 text-sm">
            <div className="font-medium">Tx: {tx.txHash}</div>
            <div className="text-textMuted break-all">Goal CID: {goalCID}</div>
            <div className="text-textMuted">Check your goal with the latest ID on the home page.</div>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
