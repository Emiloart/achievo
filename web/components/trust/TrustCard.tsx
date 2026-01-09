import { Badge } from "../ui/Badge";
import { Card, CardBody, CardHeader } from "../ui/Card";
import { Accordion } from "../ui/Accordion";
import { HashDisplay } from "../ui/HashDisplay";
import type { TrustCheck, TrustState } from "../../trust/types";
import type { ReactNode } from "react";

const stateVariant: Record<TrustState, { label: string; badge: Parameters<typeof Badge>[0]["variant"] }> = {
  VERIFIED: { label: "Verified", badge: "verified" },
  ANCHORED: { label: "Anchored", badge: "verified" },
  SIGNED_ONLY: { label: "Signed", badge: "partial" },
  PARTIAL: { label: "Partial", badge: "partial" },
  UNVERIFIED: { label: "Unverified", badge: "unverified" },
  PRIVATE: { label: "Private", badge: "private" },
  UNLISTED: { label: "Unlisted", badge: "unlisted" },
  ERROR: { label: "Unavailable", badge: "danger" },
};

const checkTone: Record<TrustCheck["status"], string> = {
  pass: "text-success",
  warn: "text-warning",
  fail: "text-danger",
  unknown: "text-textMuted",
};

export function TrustCard({
  title,
  subtitle,
  state,
  checks,
  hash,
  anchor,
  cta,
}: {
  title: string;
  subtitle?: string;
  state: TrustState;
  checks: TrustCheck[];
  hash?: string | null;
  anchor?: {
    chainId?: number | null;
    contract?: string | null;
    txHash?: string | null;
  };
  cta?: ReactNode;
}) {
  const badge = stateVariant[state] || stateVariant.UNVERIFIED;
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-textMuted">{subtitle}</div>}
        </div>
        <Badge variant={badge.badge}>{badge.label}</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        {hash && <HashDisplay label="Hash" value={hash} />}
        {anchor?.txHash && (
          <HashDisplay
            label="Anchor tx"
            value={anchor.txHash}
            href={
              anchor.chainId === 84532
                ? `https://sepolia.basescan.org/tx/${anchor.txHash}`
                : `https://sepolia.basescan.org/tx/${anchor.txHash}`
            }
          />
        )}
        <Accordion
          items={[
            {
              id: "checks",
              title: "Verification details",
              content: (
                <div className="space-y-2">
                  {checks.map((check) => (
                    <div key={check.name} className="flex items-center justify-between text-xs">
                      <span className="text-textMuted">{check.name}</span>
                      <span className={checkTone[check.status]}>{check.status}</span>
                    </div>
                  ))}
                </div>
              ),
            },
          ]}
        />
        {cta && <div>{cta}</div>}
      </CardBody>
    </Card>
  );
}
