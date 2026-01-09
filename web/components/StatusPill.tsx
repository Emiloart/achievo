"use client";
import type { GoalStatus } from "../hooks/useUserTasks";
import { Badge } from "./ui";

const STYLES: Record<GoalStatus, { text: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
  DRAFT: { text: "Draft", variant: "neutral" },
  SUBMITTED: { text: "Submitted", variant: "info" },
  PENDING_PEER: { text: "Pending peer", variant: "warning" },
  VERIFIED: { text: "Verified", variant: "success" },
  BADGED: { text: "Badged", variant: "verified" },
  LEGACY_IMPORTED: { text: "Imported", variant: "neutral" },
};

export function StatusPill({ status, className }: { status: GoalStatus; className?: string }) {
  const style = STYLES[status] ?? STYLES.DRAFT;
  return (
    <Badge variant={style.variant} className={className}>
      {style.text}
    </Badge>
  );
}
