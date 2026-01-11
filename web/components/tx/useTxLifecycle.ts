"use client";

import { useCallback, useState } from "react";
import { usePublicClient } from "wagmi";
import type { TxError, TxState } from "./TxTypes";

function normalizeTxError(error: any): TxError {
  const message = String(error?.shortMessage || error?.message || "Transaction failed");
  const lower = message.toLowerCase();
  if (lower.includes("user rejected") || lower.includes("denied") || lower.includes("rejected")) {
    return { type: "rejected", message: "Transaction cancelled." };
  }
  if (lower.includes("revert")) {
    return { type: "reverted", message };
  }
  return { type: "unknown", message };
}

export type TxSubmitResult = {
  status: "confirmed" | "reverted" | "rejected" | "failed" | "unknown";
  txHash?: `0x${string}` | null;
  error?: TxError | null;
};

export type TxLifecycleResult = {
  state: TxState;
  txHash: `0x${string}` | null;
  error: TxError | null;
  submit: (submitter: () => Promise<`0x${string}`>, confirmations?: number) => Promise<TxSubmitResult>;
  reset: () => void;
  setState: (state: TxState) => void;
};

export function useTxLifecycle(defaultConfirmations = 1): TxLifecycleResult {
  const publicClient = usePublicClient();
  const [state, setState] = useState<TxState>("idle");
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<TxError | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setTxHash(null);
    setError(null);
  }, []);

  const submit = useCallback(
    async (submitter: () => Promise<`0x${string}`>, confirmations?: number): Promise<TxSubmitResult> => {
      const targetConfirmations = confirmations ?? defaultConfirmations;
      setState("walletPrompt");
      setError(null);
      try {
        const hash = await submitter();
        setTxHash(hash);
        setState("submitted");
        if (!publicClient) {
          setState("unknown");
          const unknownError = { type: "unknown", message: "Wallet client unavailable. Try again." } as const;
          setError(unknownError);
          return { status: "unknown", txHash: hash, error: unknownError };
        }
        setState("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          confirmations: Math.max(1, targetConfirmations),
        });
        if (receipt.status === "reverted") {
          setState("failed");
          const revertedError = { type: "reverted", message: "Transaction reverted." } as const;
          setError(revertedError);
          return { status: "reverted", txHash: hash, error: revertedError };
        }
        setState("finalized");
        return { status: "confirmed", txHash: hash };
      } catch (err: any) {
        const normalized = normalizeTxError(err);
        setState("failed");
        setError(normalized);
        const status = normalized.type === "rejected" ? "rejected" : "failed";
        return { status, error: normalized };
      }
    },
    [defaultConfirmations, publicClient],
  );

  return { state, txHash, error, submit, reset, setState };
}
