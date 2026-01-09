/**
 * Recent goals hook.
 *
 * Fetches a limited set of recent goals for quick dashboard summaries.
 */
"use client";
import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { coreAddress, coreAbi } from "../lib/contracts";

export interface GoalStruct {
  id: bigint;
  creator: string;
  goalCID: string;
  evidenceCID: string;
  level: number;
  approvals: number;
  createdAt: bigint;
  verified: boolean;
  badgeMinted: boolean;
  peersRestricted: boolean;
  autoVerifier: string;
  autoDataHash: `0x${string}`;
  autoVerifiedAt: bigint;
}

/** Loads a limited set of recent goals for summary views. */
export function useRecentGoals(limit = 20) {
  const { data: nextGoalId } = useReadContract({
    address: coreAddress,
    abi: coreAbi,
    functionName: "nextGoalId",
  });

  const ids = useMemo(() => {
    if (!nextGoalId) return [] as bigint[];
    const max = Number(nextGoalId);
    if (max === 0) return [];
    const start = Math.max(1, max - limit);
    const arr: bigint[] = [];
    for (let id = max - 1; id >= start - 1; id--) {
      arr.push(BigInt(id + 1));
    }
    return arr;
  }, [nextGoalId, limit]);

  const { data, isPending } = useReadContracts({
    allowFailure: true,
    contracts: ids.map((id) => ({ address: coreAddress, abi: coreAbi, functionName: "getGoal", args: [id] })),
    query: { enabled: ids.length > 0 },
  });

  const goals = useMemo(() => {
    if (!data) return [] as GoalStruct[];
    return data
      .map((entry, idx) => {
        if (!entry?.result) return null;
        const result = entry.result as GoalStruct;
        return { ...result, id: ids[idx] };
      })
      .filter((g): g is GoalStruct => g !== null);
  }, [data, ids]);

  return { goals, isLoading: isPending || nextGoalId === undefined };
}
