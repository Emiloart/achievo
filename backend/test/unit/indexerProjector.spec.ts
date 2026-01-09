import { ReorgManager } from "../../src/indexer/reorg.manager";
import { LegacyBadgeProjector } from "../../src/indexer/projectors/badge.projector";
import { LegacyGoalProjector } from "../../src/indexer/projectors/goal.projector";

describe("Indexer projectors", () => {
  it("projects v1 badge transfers into ownership tables", async () => {
    const prisma = {
      legacyOwnerBadgeToken: {
        deleteMany: jest.fn(),
        upsert: jest.fn(),
      },
      legacyBadgeOwnership: {
        upsert: jest.fn(),
      },
    };

    const projector = new LegacyBadgeProjector(prisma as any);
    await projector.process([
      {
        chainId: 84532,
        contractAddress: "0xBadge",
        contractKey: "badge_v1",
        eventName: "Transfer",
        blockNumber: 10,
        txHash: "0xtx",
        logIndex: 0,
        args: {
          from: "0x0000000000000000000000000000000000000000",
          to: "0xabc",
          tokenId: "1",
        },
        eventId: "e1",
        removed: false,
      },
    ]);

    expect(prisma.legacyOwnerBadgeToken.deleteMany).not.toHaveBeenCalled();
    expect(prisma.legacyBadgeOwnership.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.legacyOwnerBadgeToken.upsert).toHaveBeenCalledTimes(1);
  });

  it("projects v1 goal lifecycle events without defaulting fields", async () => {
    const prisma = {
      legacyGoal: {
        upsert: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ creatorAddress: "0xabc" }),
      },
      legacyGoalEvidence: {
        upsert: jest.fn(),
      },
      legacyGoalApproval: {
        upsert: jest.fn(),
      },
    };
    const chain = {
      getBlockTimestamp: jest.fn().mockResolvedValue(1700000000),
    };

    const projector = new LegacyGoalProjector(prisma as any, chain as any);
    await projector.process([
      {
        chainId: 84532,
        contractAddress: "0xCore",
        contractKey: "core_v1",
        eventName: "GoalCreated",
        blockNumber: 5,
        txHash: "0xgoal",
        logIndex: 0,
        args: { goalId: "1", creator: "0xabc", goalCID: "ipfs://goal" },
        eventId: "g1",
        removed: false,
      },
      {
        chainId: 84532,
        contractAddress: "0xCore",
        contractKey: "core_v1",
        eventName: "ProofSubmitted",
        blockNumber: 6,
        txHash: "0xproof",
        logIndex: 1,
        args: { goalId: "1", evidenceCID: "ipfs://evidence" },
        eventId: "g2",
        removed: false,
      },
    ]);

    const createArgs = prisma.legacyGoal.upsert.mock.calls[0][0];
    expect(createArgs.create.verified).toBeUndefined();
    expect(createArgs.create.badgeMinted).toBeUndefined();
    expect(createArgs.create.approvals).toBeUndefined();
    expect(createArgs.create.peersRestricted).toBeUndefined();
    expect(prisma.legacyGoalEvidence.upsert).toHaveBeenCalledTimes(1);
  });
});

describe("ReorgManager", () => {
  it("rolls back logs/events on reorg", async () => {
    const prisma = {
      chainLog: { updateMany: jest.fn() },
      decodedEvent: { updateMany: jest.fn() },
      chainCursor: { update: jest.fn() },
    };
    const client = {
      getBlock: jest.fn().mockResolvedValue({ hash: "0xdead" }),
    };

    const manager = new ReorgManager(prisma as any, client as any);
    const result = await manager.detectAndHandle(
      84532,
      { latestProcessedBlock: 100, latestProcessedBlockHash: "0xabc" },
      80,
      10,
    );

    expect(result.reorged).toBe(true);
    expect(prisma.chainLog.updateMany).toHaveBeenCalledWith({
      where: { chainId: 84532, blockNumber: { gte: 90 } },
      data: { removed: true },
    });
    expect(prisma.decodedEvent.updateMany).toHaveBeenCalledWith({
      where: { chainId: 84532, blockNumber: { gte: 90 } },
      data: { removed: true },
    });
  });
});
