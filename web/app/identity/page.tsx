"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useChainId } from "wagmi";
import { IdentityBadge } from "../../components/IdentityBadge";
import { useIdentityRegistration } from "../../hooks/useIdentity";
import { PageHeader } from "../../components/nav/PageHeader";
import { TxStepper } from "../../components/tx/TxStepper";
import { FinalityTimeline } from "../../components/tx/FinalityTimeline";
import { Badge, Button, Card, CardBody, Section } from "../../components/ui";
import { UI_LABELS } from "../../lib/uiCopy";

const ConnectWallet = dynamic(() => import("../../components/ConnectWallet").then((m) => m.ConnectWallet), {
  ssr: false,
});

export default function IdentityPage() {
  const chainId = useChainId();
  const { register, registering, userId, hasContract, address, isLoading, error, txState, txHash, txError } =
    useIdentityRegistration();

  const hasId = Boolean(userId && userId > 0n);
  const canClaim = hasContract && address && !hasId;
  const buttonLabel = !hasContract
    ? "Identity contract not set"
    : !address
      ? "Connect wallet to claim"
      : hasId
        ? "ID already claimed"
        : registering
          ? "Claiming..."
          : `${UI_LABELS.create} Achievo ID`;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <PageHeader
        title="Identity"
        description="Connect a wallet to sign in and claim the Achievo ID that anchors your activity."
      />
      <Section
        title="Identity and sign in"
        description="Connect a wallet to sign in. The same action creates your Achievo identity."
      >
        <Card>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-textMuted">Wallet connection is both login and account creation.</div>
              {hasId && address && <Badge variant="verified">ID claimed</Badge>}
            </div>
            {hasId && address && (
              <div className="text-xs text-textMuted">
                Already claimed as {address.slice(0, 6)}...{" "}
                <Link href="/dashboard" className="text-accent hover:underline">
                  Go to dashboard
                </Link>
              </div>
            )}
          </CardBody>
        </Card>
      </Section>

      <Section
        title="Step 1 - Connect wallet"
        description="Wallet connection is required to access your Achievo account."
      >
        <Card>
          <CardBody>
            <ConnectWallet />
          </CardBody>
        </Card>
      </Section>

      <Section
        title="Step 2 - Claim Achievo ID"
        description="Your ID looks like ACHUSR-0000001234 and anchors all achievements."
      >
        <Card>
          <CardBody className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <IdentityBadge />
              <Button onClick={register} disabled={!canClaim || registering || isLoading}>
                {buttonLabel}
              </Button>
            </div>
            {!hasContract && (
              <div className="text-xs text-danger">Set NEXT_PUBLIC_IDENTITY_ADDRESS to enable claiming.</div>
            )}
            {hasId && <div className="text-xs text-success">Achievo ID already claimed for this wallet.</div>}
            {!hasId && (
              <ol className="list-decimal list-inside text-xs text-textMuted space-y-1">
                <li>Connect your wallet.</li>
                <li>Click &quot;Claim Achievo ID&quot;. Confirm the transaction.</li>
                <li>Wait for confirmation; your ID will appear above.</li>
              </ol>
            )}
            <div className="text-xs text-textMuted">
              Username claims are separate: check availability, submit the on-chain registry claim, then the backend
              binds the handle to your profile.
            </div>
            {registering && <div className="text-xs text-info">Waiting for transaction confirmation...</div>}
            {isLoading && <div className="text-xs text-textMuted">Fetching your current ID...</div>}
            {error && <div className="text-xs text-danger">{error}</div>}
            {txState !== "idle" || txError ? <TxStepper state={txState} txHash={txHash} error={txError} /> : null}
            {txState !== "idle" || txError ? (
              <FinalityTimeline state={txState} txHash={txHash} chainId={chainId || undefined} />
            ) : null}
          </CardBody>
        </Card>
      </Section>

      <Section
        title="Step 3 - Recovery and sub-wallets"
        description="Recovery and sub-wallet management is available on-chain, but the UI is not yet implemented."
      >
        <Card>
          <CardBody className="space-y-2 text-sm text-textMuted">
            <ul className="list-disc list-inside space-y-1">
              <li>Recovery wallet can update primary wallet.</li>
              <li>Add or remove sub-wallets that can act for the same Achievo ID.</li>
              <li>All achievements stay bound to your ID.</li>
            </ul>
            <div className="text-xs text-warning">
              UI controls are not available yet. Use the on-chain functions <code className="px-1">setRecoveryKey</code>
              , <code className="px-1">addSubWallet</code>, and <code className="px-1">removeSubWallet</code> via a
              trusted wallet client if needed.
            </div>
          </CardBody>
        </Card>
      </Section>
    </div>
  );
}
