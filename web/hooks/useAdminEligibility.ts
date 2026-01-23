"use client";

import { useMemo } from "react";
import { useAccount, useReadContract } from "wagmi";
import { coreAbi, coreAddress } from "../lib/contracts";

export function useAdminEligibility() {
  const { address } = useAccount();
  const { data: owner } = useReadContract({
    address: coreAddress || undefined,
    abi: coreAbi,
    functionName: "owner",
    query: { enabled: Boolean(coreAddress) },
  });

  return useMemo(() => {
    if (!address || !owner) return false;
    return address.toLowerCase() === String(owner).toLowerCase();
  }, [address, owner]);
}
