"use client";
import { Badge } from "./ui";

const STYLES: Record<string, { text: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
  DRAFT: { text: "Draft", variant: "neutral" },
  SUBMITTED: { text: "Submitted", variant: "info" },
  PENDING_PEER: { text: "Pending peer", variant: "warning" },
  VERIFIED: { text: "Verified", variant: "success" },
  BADGED: { text: "Badged", variant: "verified" },
  LEGACY_IMPORTED: { text: "Imported", variant: "neutral" },
  OPEN: { text: "Open", variant: "info" },
  FILLED: { text: "Filled", variant: "success" },
  CANCELED: { text: "Canceled", variant: "neutral" },
  EXPIRED: { text: "Expired", variant: "warning" },
  PENDING: { text: "Pending", variant: "info" },
  CONFIRMED: { text: "Confirmed", variant: "verified" },
  FAILED: { text: "Failed", variant: "danger" },
  DROPPED_REORG: { text: "Reorged", variant: "warning" },
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  const style = STYLES[status] ?? { text: status, variant: "neutral" };
  return (
    <Badge variant={style.variant} className={className}>
      {style.text}
    </Badge>
  );
}
