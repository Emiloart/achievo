"use client";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { coreAddress, coreAbi } from "../../lib/contracts";
import toast from "react-hot-toast";

export default function AdminPage() {
  const { address } = useAccount();
  const { data: owner } = useReadContract({ address: coreAddress, abi: coreAbi, functionName: "owner" });
  const { data: threshold } = useReadContract({ address: coreAddress, abi: coreAbi, functionName: "peerThreshold" });
  const [newThresh, setNewThresh] = useState<string>("");
  const [goalId, setGoalId] = useState<string>("");
  const [dataHash, setDataHash] = useState<string>("");

  const isOwner = useMemo(
    () => owner && address && owner.toString().toLowerCase() === address.toLowerCase(),
    [owner, address],
  );
  const thresholdValue = threshold !== undefined ? Number(threshold) : undefined;

  const { writeContract, data: hash, isPending } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });

  const setThreshold = async () => {
    try {
      const n = Number(newThresh);
      if (!Number.isInteger(n) || n < 5 || n > 50) throw new Error("Threshold must be 5-50");
      writeContract({ address: coreAddress, abi: coreAbi, functionName: "setPeerThreshold", args: [n] });
      toast.loading("Updating threshold...");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed");
    }
  };

  const autoVerify = async () => {
    try {
      const id = BigInt(goalId);
      if (!dataHash || !dataHash.startsWith("0x") || dataHash.length !== 66) {
        throw new Error("dataHash must be 32-byte hex");
      }
      writeContract({
        address: coreAddress,
        abi: coreAbi,
        functionName: "verifyAuto",
        args: [id, dataHash as `0x${string}`],
      });
      toast.loading("Verifying (AUTO)...");
    } catch (e: any) {
      toast.error(e?.shortMessage || e?.message || "Failed");
    }
  };

  if (!isOwner) {
    return (
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Admin</h2>
        <div className="text-gray-600">Connect as contract owner to manage settings.</div>
        <div className="text-sm text-gray-500">Owner: {owner as string}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Admin</h2>
      <div className="rounded-xl border bg-white p-5 space-y-3 max-w-xl">
        <div className="text-sm text-gray-600">Current threshold</div>
        <div className="text-3xl font-semibold">{thresholdValue !== undefined ? thresholdValue : "-"}</div>
        <div className="flex gap-2 items-center">
          <input
            value={newThresh}
            onChange={(e) => setNewThresh(e.target.value)}
            placeholder="5-50"
            className="rounded-md border px-3 py-2"
          />
          <button disabled={isPending} onClick={setThreshold} className="px-4 py-2 rounded-md bg-brand-600 text-white">
            Update
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-5 space-y-3 max-w-xl">
        <div className="font-medium">AUTO Verify</div>
        <input
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          placeholder="Goal ID"
          className="rounded-md border px-3 py-2"
        />
        <input
          value={dataHash}
          onChange={(e) => setDataHash(e.target.value)}
          placeholder="0x... (keccak256 of payload)"
          className="rounded-md border px-3 py-2"
        />
        <button disabled={isPending} onClick={autoVerify} className="px-4 py-2 rounded-md bg-brand-600 text-white">
          Verify
        </button>
        <p className="text-xs text-gray-500">
          Paste the keccak256 hash of your AUTO verification JSON payload. See the AUTO policy doc for required fields.
        </p>
      </div>

      {receipt.data && (
        <div className="rounded-md border bg-white p-4">
          <div className="font-medium">Last Tx: {hash}</div>
        </div>
      )}
    </div>
  );
}
