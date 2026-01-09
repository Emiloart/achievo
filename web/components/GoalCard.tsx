"use client";
import Link from "next/link";
import { shortAchievoId } from "../lib/achievo";
import type { GoalStruct } from "../hooks/useRecentGoals";
import type { GoalWithStatus } from "../hooks/useUserTasks";
import { VisibilityControls } from "./VisibilityControls";
import { Badge, Button, Card, CardBody, uiToast } from "./ui";

const LEVELS = ["NONE", "SELF", "PEER", "AUTO"];

interface Props {
  goal: GoalStruct | GoalWithStatus;
  threshold: number;
  showCreator?: boolean;
  showShareLink?: boolean;
  showPrivacyControls?: boolean;
  onPrivacyUpdated?: () => void;
}

function toNumber(value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function GoalCard({
  goal,
  threshold,
  showCreator = true,
  showShareLink = false,
  showPrivacyControls,
  onPrivacyUpdated,
}: Props) {
  const approvals = toNumber(goal.approvals);
  const t = Math.max(1, threshold || 1);
  const progress = Math.min(100, Math.floor((approvals / t) * 100));
  const goalId = typeof goal.id === "bigint" ? goal.id.toString() : String(goal.id);
  const shareLink =
    typeof window !== "undefined" ? `${window.location.origin}/approve?goalId=${goalId}` : `/approve?goalId=${goalId}`;
  const redaction = (goal as GoalWithStatus).redaction || "NONE";
  const visibility = (goal as GoalWithStatus).visibility;
  const unlistedPublicId = (goal as GoalWithStatus).unlistedPublicId;
  const goalCid = goal.goalCID || "";
  const showMetadata = Boolean(showPrivacyControls) || (redaction !== "METADATA_ONLY" && redaction !== "FULL");

  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between">
          <Link href={`/goals/${goalId}`} className="font-semibold hover:underline">
            Goal #{goalId}
          </Link>
          <Badge variant="neutral">{LEVELS[toNumber(goal.level)] || "NONE"}</Badge>
        </div>
        {showCreator && (
          <div className="text-xs text-textMuted">
            Creator: <span className="font-mono">{shortAchievoId(goal.creator)}</span>
          </div>
        )}
        <div className="text-xs text-textMuted truncate">Goal CID: {showMetadata ? goalCid || "-" : "Hidden"}</div>
        {goal.peersRestricted && <div className="text-xs text-warning">Peer approvals restricted to allowlist</div>}
        <div className="text-sm text-textMuted">Approvals</div>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-surface2 rounded-full overflow-hidden">
            <div className={`h-full ${goal.verified ? "bg-success" : "bg-accent"}`} style={{ width: `${progress}%` }} />
          </div>
          <div className="text-xs">
            {approvals}/{t}
          </div>
        </div>
        <div className="text-xs text-textMuted">{goal.verified ? "Verified" : "Pending"}</div>
        {goal.badgeMinted && <Badge variant="verified">Badge minted</Badge>}
        {showShareLink && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const link =
                typeof window !== "undefined" ? `${window.location.origin}/approve?goalId=${goalId}` : shareLink;
              if (typeof navigator !== "undefined") {
                navigator.clipboard.writeText(link);
                uiToast.success("Link copied");
              } else {
                uiToast.error("Clipboard unavailable");
              }
            }}
          >
            Copy approval link
          </Button>
        )}
        {showPrivacyControls && (
          <VisibilityControls
            contentType="ACHIEVEMENT"
            contentId={goalId}
            visibility={visibility}
            redaction={redaction as any}
            showRedaction
            unlistedPublicId={unlistedPublicId}
            onUpdated={onPrivacyUpdated ? () => onPrivacyUpdated() : undefined}
          />
        )}
      </CardBody>
    </Card>
  );
}
