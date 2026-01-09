import { ConsistencyScoringService } from "../../src/consistency/consistencyScoring.service";
import { ActivityEventType } from "../../src/consistency/activityEvent.types";

type PrismaStub = {
  professionalProfile: { findUnique: jest.Mock };
  userConsistencyScore: { findUnique: jest.Mock; upsert: jest.Mock };
  userActivityEvent: { findMany: jest.Mock };
  userRiskProfile: { findUnique: jest.Mock };
};

function buildPrismaStub(): PrismaStub {
  return {
    professionalProfile: { findUnique: jest.fn() },
    userConsistencyScore: { findUnique: jest.fn(), upsert: jest.fn() },
    userActivityEvent: { findMany: jest.fn() },
    userRiskProfile: { findUnique: jest.fn() },
  };
}

describe("ConsistencyScoringService", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2024-01-15T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns a stable baseline for empty activity", async () => {
    const prisma = buildPrismaStub();
    prisma.professionalProfile.findUnique.mockResolvedValue({ timezone: "UTC" });
    prisma.userConsistencyScore.findUnique.mockResolvedValue(null);
    prisma.userActivityEvent.findMany.mockResolvedValue([]);
    prisma.userRiskProfile.findUnique.mockResolvedValue({ riskScore: 0, riskLevel: "LOW", signals: [] });
    prisma.userConsistencyScore.upsert.mockImplementation(async (args) => args.create);

    const service = new ConsistencyScoringService(prisma as any);
    const result = await service.recompute("ACHUSR-0000000001");

    expect(result.streakDays).toBe(0);
    expect(result.bestStreakDays).toBe(0);
    expect(result.reliabilityScore).toBe(35);
    expect(result.anomalyScore).toBe(0);
    expect(result.credibilityScore).toBe(32);
  });

  it("is deterministic for the same input", async () => {
    const prisma = buildPrismaStub();
    prisma.professionalProfile.findUnique.mockResolvedValue({ timezone: "UTC" });
    prisma.userConsistencyScore.findUnique.mockResolvedValue(null);
    prisma.userRiskProfile.findUnique.mockResolvedValue({ riskScore: 10, riskLevel: "MED", signals: ["signal"] });

    const baseTime = new Date("2024-01-10T12:00:00Z");
    const events = [
      { type: ActivityEventType.TASK_STARTED, occurredAt: baseTime, weight: 1, refId: "task-1" },
      {
        type: ActivityEventType.TASK_COMPLETED,
        occurredAt: new Date(baseTime.getTime() + 3600_000),
        weight: 1,
        refId: "task-1",
      },
    ];
    prisma.userActivityEvent.findMany.mockResolvedValue(events);
    prisma.userConsistencyScore.upsert.mockImplementation(async (args) => args.create);

    const service = new ConsistencyScoringService(prisma as any);
    const first = await service.recompute("ACHUSR-0000000001");
    const second = await service.recompute("ACHUSR-0000000001");

    expect(first.credibilityScore).toBe(second.credibilityScore);
    expect(first.streakScore).toBe(second.streakScore);
    expect(first.anomalyScore).toBe(second.anomalyScore);
  });

  it("flags burst anomalies and clamps scores", async () => {
    const prisma = buildPrismaStub();
    prisma.professionalProfile.findUnique.mockResolvedValue({ timezone: "UTC" });
    prisma.userConsistencyScore.findUnique.mockResolvedValue(null);
    prisma.userRiskProfile.findUnique.mockResolvedValue({ riskScore: 0, riskLevel: "LOW", signals: [] });

    const start = new Date("2024-01-15T11:50:00Z");
    const events = Array.from({ length: 25 }).map((_, idx) => ({
      type: ActivityEventType.TASK_STARTED,
      occurredAt: new Date(start.getTime() + idx * 30_000),
      weight: 1,
      refId: `burst-${idx}`,
    }));
    prisma.userActivityEvent.findMany.mockResolvedValue(events);
    prisma.userConsistencyScore.upsert.mockImplementation(async (args) => args.create);

    const service = new ConsistencyScoringService(prisma as any);
    const result = await service.recompute("ACHUSR-0000000001");

    expect(result.anomalyScore).toBeGreaterThan(0);
    expect(result.credibilityScore).toBeGreaterThanOrEqual(0);
    expect(result.credibilityScore).toBeLessThanOrEqual(100);
    const anomalies = (result.explanations as any).anomalies || [];
    expect(anomalies.some((entry: string) => entry.includes("Burst activity"))).toBe(true);
  });
});
