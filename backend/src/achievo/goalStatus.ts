export enum GoalStatus {
  DRAFT = "DRAFT",
  SUBMITTED = "SUBMITTED",
  PENDING_PEER = "PENDING_PEER",
  VERIFIED = "VERIFIED",
  BADGED = "BADGED",
  LEGACY_IMPORTED = "LEGACY_IMPORTED",
}

export type GoalDto = {
  id: number;
  creator: string;
  goalCID: string | null;
  evidenceCID: string | null;
  level: number | null;
  approvals: number | null;
  createdAt: number | null;
  verified: boolean | null;
  badgeMinted: boolean | null;
  peersRestricted: boolean | null;
  autoVerifier: string | null;
  autoDataHash: string | null;
  autoVerifiedAt: number | null;
  legacyId: string | null;
  legacyTxHash: string | null;
};

function isMigrated(goal: GoalDto): boolean {
  return goal.legacyId !== undefined && goal.legacyId !== null && goal.legacyId !== "" && goal.legacyId !== "0";
}

export function deriveGoalStatus(goal: GoalDto): GoalStatus {
  const hasEvidence = (goal.evidenceCID || "").trim().length > 0;
  const migrated = isMigrated(goal);
  const approvals = Number(goal.approvals || 0);

  if (goal.verified) {
    return goal.badgeMinted ? GoalStatus.BADGED : GoalStatus.VERIFIED;
  }

  if (hasEvidence) {
    // Evidence submitted but not verified; consider peer approvals in progress if any approvals exist.
    if (approvals > 0) return GoalStatus.PENDING_PEER;
    return GoalStatus.SUBMITTED;
  }

  // Optional legacy marker for untouched imports.
  if (migrated) return GoalStatus.LEGACY_IMPORTED;

  return GoalStatus.DRAFT;
}

export function computeXpAndLevel(goals: Array<GoalDto & { status: GoalStatus }>) {
  let xp = 0;
  for (const g of goals) {
    switch (g.status) {
      case GoalStatus.BADGED:
        xp += 20;
        break;
      case GoalStatus.VERIFIED:
        xp += 10;
        break;
      case GoalStatus.SUBMITTED:
        xp += 2;
        break;
      default:
        break;
    }
  }

  const level = computeLevelFromXp(xp);

  return { xp, level };
}

export function withStatus(goal: GoalDto) {
  const status = deriveGoalStatus(goal);
  return { ...goal, status, isMigrated: isMigrated(goal) };
}

export function computeLevelFromXp(xp: number) {
  const safeXp = Number.isFinite(xp) ? xp : 0;
  if (safeXp >= 600) return 5;
  if (safeXp >= 300) return 4;
  if (safeXp >= 150) return 3;
  if (safeXp >= 50) return 2;
  return 1;
}
