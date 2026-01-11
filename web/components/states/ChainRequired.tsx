"use client";

import { useChainId, useSwitchChain } from "wagmi";
import { Button, Card, CardBody } from "../ui";

export type ChainRequiredProps = {
  requiredChainId: number;
  requiredChainLabel?: string;
  description?: string;
};

export function ChainRequired({
  requiredChainId,
  requiredChainLabel,
  description = "Switch networks to continue with this on-chain action.",
}: ChainRequiredProps) {
  const chainId = useChainId();
  const { switchChainAsync, chains, isPending } = useSwitchChain();
  const targetLabel =
    requiredChainLabel || chains.find((chain) => chain.id === requiredChainId)?.name || "required network";

  if (chainId === requiredChainId) return null;

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="text-sm font-semibold">Wrong network</div>
        <div className="text-xs text-textMuted">{description}</div>
        <div className="text-xs text-textMuted">Expected: {targetLabel}</div>
        {switchChainAsync ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => switchChainAsync({ chainId: requiredChainId })}
            disabled={isPending}
          >
            {isPending ? "Switching..." : "Switch network"}
          </Button>
        ) : null}
      </CardBody>
    </Card>
  );
}
