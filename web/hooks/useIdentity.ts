/**
 * On-chain identity hooks.
 *
 * Reads identity contract state and tracks transaction confirmations for identity operations.
 */
"use client";
import { useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { identityAddress, identityAbi } from "../lib/contracts";

/** Reads the on-chain identity ID for a given wallet address. */
export function useIdentityId(targetAddress?: `0x${string}`) {
  const enabled = Boolean(identityAddress && targetAddress);
  const result = useReadContract({
    address: enabled ? identityAddress : undefined,
    abi: identityAbi,
    functionName: "getUserId",
    args: enabled ? [targetAddress!] : undefined,
    query: { enabled },
  });

  return {
    userId: (result.data as bigint | undefined) ?? 0n,
    isLoading: result.isFetching,
    refetch: result.refetch,
  };
}

/** Tracks identity registration transactions for the connected wallet. */
export function useIdentityRegistration() {
  const { address } = useAccount();
  const hasContract = Boolean(identityAddress);
  const { userId: currentId, isLoading, refetch } = useIdentityId(address as `0x${string}` | undefined);
  const [error, setError] = useState<string>("");
  const { writeContract, data: txHash, isPending, reset } = useWriteContract();
  const { isLoading: waitingReceipt, data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (receipt?.status === "success") {
      refetch();
      setError("");
    } else if (receipt?.status === "reverted") {
      setError("Transaction reverted");
    }
  }, [receipt, refetch]);

  const register = () => {
    if (!address) {
      setError("Connect a wallet first.");
      return;
    }
    if (!hasContract) {
      setError("Identity contract not configured.");
      return;
    }
    setError("");
    reset?.();
    writeContract({ address: identityAddress, abi: identityAbi, functionName: "register" });
  };

  const formattedId = useMemo(() => (currentId && currentId > 0n ? currentId : 0n), [currentId]);

  return {
    address,
    userId: formattedId,
    isLoading: isLoading || waitingReceipt,
    registering: isPending,
    register,
    error,
    hasContract,
  };
}
