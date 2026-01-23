/**
 * On-chain identity hooks.
 *
 * Reads identity contract state and tracks transaction confirmations for identity operations.
 */
"use client";
import { useMemo, useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { identityAddress, identityAbi } from "../lib/contracts";
import { useTxLifecycle } from "../components/tx/useTxLifecycle";
import { asyncConfirmed, asyncFailed, asyncIdle, asyncLoading, asyncPending, asyncUnknown } from "../types/asyncState";
import type { AsyncState } from "../types/asyncState";

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
    state: (() => {
      if (!enabled) return asyncIdle<bigint>();
      if (result.isFetching) return asyncLoading<bigint>();
      if (result.error) return asyncFailed<bigint>("Unable to load identity.");
      return asyncConfirmed<bigint>(((result.data as bigint | undefined) ?? 0n) as bigint);
    })() as AsyncState<bigint>,
  };
}

/** Tracks identity registration transactions for the connected wallet. */
export function useIdentityRegistration() {
  const { address } = useAccount();
  const hasContract = Boolean(identityAddress);
  const { userId: currentId, isLoading, refetch } = useIdentityId(address as `0x${string}` | undefined);
  const [error, setError] = useState<string>("");
  const { writeContractAsync, reset } = useWriteContract();
  const tx = useTxLifecycle(1);

  const register = async () => {
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
    tx.reset();
    const result = await tx.submit(() =>
      writeContractAsync({ address: identityAddress, abi: identityAbi, functionName: "register" }),
    );
    if (result.status === "confirmed") {
      await refetch();
      setError("");
      return;
    }
    if (result.error?.message) {
      setError(result.error.message);
    }
  };

  const formattedId = useMemo(() => (currentId && currentId > 0n ? currentId : 0n), [currentId]);
  const registrationState: AsyncState<null> = useMemo(() => {
    if (tx.state === "walletPrompt" || tx.state === "submitted" || tx.state === "confirming") {
      return asyncPending(null);
    }
    if (tx.state === "finalized") {
      return asyncConfirmed(null);
    }
    if (tx.state === "failed") {
      return asyncFailed(tx.error?.message || "Transaction failed.");
    }
    if (tx.state === "unknown") {
      return asyncUnknown(tx.error?.message);
    }
    return asyncIdle(null);
  }, [tx.error?.message, tx.state]);

  return {
    address,
    userId: formattedId,
    isLoading: isLoading || tx.state === "confirming",
    registering: tx.state === "walletPrompt" || tx.state === "submitted" || tx.state === "confirming",
    register,
    error,
    hasContract,
    txState: tx.state,
    txHash: tx.txHash,
    txError: tx.error,
    registrationState,
  };
}
