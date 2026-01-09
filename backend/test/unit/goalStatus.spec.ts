import {
  computeLevelFromXp,
  computeXpAndLevel,
  deriveGoalStatus,
  GoalStatus,
  GoalDto,
  withStatus,
} from "../../src/achievo/goalStatus";

describe("goalStatus", () => {
  const baseGoal: GoalDto = {
    id: 1,
    creator: "0xabc",
    goalCID: "ipfs://goal",
    evidenceCID: "",
    level: 1,
    approvals: 0,
    createdAt: 0,
    verified: false,
    badgeMinted: false,
    peersRestricted: false,
    autoVerifier: "",
    autoDataHash: "",
    autoVerifiedAt: 0,
    legacyId: "",
    legacyTxHash: "",
  };

  it("returns DRAFT when no evidence and not verified", () => {
    expect(deriveGoalStatus(baseGoal)).toBe(GoalStatus.DRAFT);
  });

  it("returns SUBMITTED when evidence exists without approvals", () => {
    const goal = { ...baseGoal, evidenceCID: "ipfs://evidence" };
    expect(deriveGoalStatus(goal)).toBe(GoalStatus.SUBMITTED);
  });

  it("returns PENDING_PEER when evidence exists with approvals", () => {
    const goal = { ...baseGoal, evidenceCID: "ipfs://evidence", approvals: 2 };
    expect(deriveGoalStatus(goal)).toBe(GoalStatus.PENDING_PEER);
  });

  it("returns VERIFIED when verified without badge minted", () => {
    const goal = { ...baseGoal, verified: true };
    expect(deriveGoalStatus(goal)).toBe(GoalStatus.VERIFIED);
  });

  it("returns BADGED when verified and badge minted", () => {
    const goal = { ...baseGoal, verified: true, badgeMinted: true };
    expect(deriveGoalStatus(goal)).toBe(GoalStatus.BADGED);
  });

  it("returns LEGACY_IMPORTED when legacyId exists and no evidence", () => {
    const goal = { ...baseGoal, legacyId: "123" };
    expect(deriveGoalStatus(goal)).toBe(GoalStatus.LEGACY_IMPORTED);
  });

  it("computes xp + level deterministically", () => {
    const goals = [
      { ...baseGoal, verified: true, badgeMinted: true },
      { ...baseGoal, verified: true, badgeMinted: false },
      { ...baseGoal, evidenceCID: "ipfs://evidence" },
    ].map((g) => withStatus(g));

    const result = computeXpAndLevel(goals);
    expect(result.xp).toBe(20 + 10 + 2);
    expect(result.level).toBe(computeLevelFromXp(result.xp));
  });

  it("caps level thresholds correctly", () => {
    expect(computeLevelFromXp(0)).toBe(1);
    expect(computeLevelFromXp(50)).toBe(2);
    expect(computeLevelFromXp(150)).toBe(3);
    expect(computeLevelFromXp(300)).toBe(4);
    expect(computeLevelFromXp(600)).toBe(5);
  });
});
