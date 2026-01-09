"use client";
import { useEffect, useState } from "react";
import { useAccount, useConnect, useDisconnect, useChainId, useSwitchChain } from "wagmi";
import { useBackendAuth } from "../hooks/useBackendAuth";
import { useIdentityId } from "../hooks/useIdentity";
import { formatAchievoId } from "../lib/userId";
import { Badge, Button } from "./ui";

export function ConnectWallet() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnecting, error } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { chains = [], switchChain, isPending: isSwitching } = useSwitchChain();
  const { signIn, signOut, user, loading: authLoading, error: authError } = useBackendAuth();
  const { userId } = useIdentityId(address as `0x${string}` | undefined);
  const achIdLabel = formatAchievoId(userId) ?? "";

  if (!mounted) return <div className="h-8" />; // stable SSR placeholder

  if (!isConnected) {
    return (
      <div className="flex gap-2 flex-wrap">
        {connectors.map((c) => (
          <Button
            key={c.uid}
            onClick={() => connect({ connector: c })}
            variant="secondary"
            size="sm"
            disabled={isConnecting}
          >
            Connect {c.name}
          </Button>
        ))}
        {error && <span className="text-danger text-sm">{error.message}</span>}
      </div>
    );
  }

  const chain = chains.find((x) => x.id === chainId);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-mono">
        {address?.slice(0, 6)}.{address?.slice(-4)}
      </span>
      {chain?.name && <Badge variant="neutral">{chain.name}</Badge>}
      <Button variant="ghost" size="sm" onClick={() => disconnect()}>
        Disconnect
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => switchChain?.({ chainId: chains[0]?.id ?? chainId })}
        disabled={isSwitching}
      >
        Switch Chain
      </Button>
      {user ? (
        <Button variant="secondary" size="sm" onClick={() => signOut()} disabled={authLoading}>
          {authLoading ? "Signing..." : "Sign out"}
        </Button>
      ) : (
        <Button variant="secondary" size="sm" onClick={() => signIn()} disabled={authLoading}>
          {authLoading ? "Signing..." : "Sign in"}
        </Button>
      )}
      {achIdLabel && <Badge variant="verified">ACHIEVO ID: {achIdLabel}</Badge>}
      {authError && <span className="text-xs text-danger">{authError}</span>}
      {!user && <span className="text-xs text-warning">Sign in once to enable backend features.</span>}
    </div>
  );
}
