"use client";

import { useAccount } from "wagmi";
import { useBackendAuth } from "../../hooks/useBackendAuth";
import { Button, StatusBadge } from "../ui";

export function SessionStatus() {
  const { address } = useAccount();
  const { user, loading, error, signIn } = useBackendAuth();

  if (loading) {
    return <StatusBadge tone="info">Session refreshing</StatusBadge>;
  }

  if (user) {
    return <StatusBadge tone="success">Signed in</StatusBadge>;
  }

  if (error) {
    return <StatusBadge tone="warning">Session issue</StatusBadge>;
  }

  if (!address) {
    return <StatusBadge tone="neutral">Wallet not connected</StatusBadge>;
  }

  return (
    <div className="flex items-center gap-2">
      <StatusBadge tone="warning">Session expired</StatusBadge>
      <Button variant="secondary" size="sm" onClick={signIn}>
        Sign in
      </Button>
    </div>
  );
}
