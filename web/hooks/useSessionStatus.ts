"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { useBackendAuth } from "./useBackendAuth";

export type SessionStatus = "authenticated" | "refreshing" | "expired" | "signed_out";

export type SessionStatusSnapshot = {
  status: SessionStatus;
  address: string | null;
  userId: string | null;
  message: string;
  actionLabel?: string;
  actionHref?: string;
};

/** Normalizes auth + wallet state into a predictable session status contract. */
export function useSessionStatus(): SessionStatusSnapshot {
  const { address } = useAccount();
  const { user, loading, error } = useBackendAuth();

  return useMemo(() => {
    if (loading) {
      return {
        status: "refreshing",
        address: address || null,
        userId: user?.userId || null,
        message: "Session refreshing",
      };
    }
    if (user) {
      return {
        status: "authenticated",
        address: address || null,
        userId: user.userId,
        message: "Signed in",
      };
    }
    if (!address) {
      return {
        status: "signed_out",
        address: null,
        userId: null,
        message: "Signed out",
        actionLabel: "Sign in",
        actionHref: "/identity",
      };
    }
    return {
      status: "expired",
      address,
      userId: null,
      message: error ? "Session issue" : "Session expired",
      actionLabel: "Sign in",
      actionHref: "/identity",
    };
  }, [address, error, loading, user]);
}
