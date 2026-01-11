"use client";

import { useAccount } from "wagmi";
import { ConnectWallet } from "../ConnectWallet";
import { Button, Card, CardBody } from "../ui";
import { useBackendAuth } from "../../hooks/useBackendAuth";

export type AuthRequiredProps = {
  title?: string;
  description?: string;
};

export function AuthRequired({
  title = "Sign in required",
  description = "Connect your wallet and sign in to continue.",
}: AuthRequiredProps) {
  const { isConnected } = useAccount();
  const { user, signIn, loading } = useBackendAuth();

  return (
    <Card>
      <CardBody className="space-y-4">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="text-xs text-textMuted">{description}</div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <ConnectWallet />
          {isConnected && !user ? (
            <Button type="button" size="sm" variant="secondary" onClick={signIn} disabled={loading}>
              {loading ? "Signing..." : "Sign in"}
            </Button>
          ) : null}
        </div>
      </CardBody>
    </Card>
  );
}
