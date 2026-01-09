import { AdminToolsService } from "../../src/admin-tools/admin-tools.service";
import { ChainActionStatus } from "@prisma/client";

describe("AdminToolsService", () => {
  const prisma = {
    chainActionReceipt: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    projectionRebuildRun: {
      create: jest.fn(),
      update: jest.fn(),
    },
    projectionCursor: { deleteMany: jest.fn(), upsert: jest.fn() },
    legacyBadgeOwnership: { deleteMany: jest.fn() },
    legacyOwnerBadgeToken: { deleteMany: jest.fn() },
    legacyGoalEvidence: { deleteMany: jest.fn() },
    legacyGoalApproval: { deleteMany: jest.fn() },
    legacyGoal: { deleteMany: jest.fn() },
    decodedEvent: { findMany: jest.fn().mockResolvedValue([]) },
    organization: { findUnique: jest.fn() },
    operationalAlert: { create: jest.fn() },
    user: { findUnique: jest.fn() },
    proofArtifact: { findUnique: jest.fn() },
    validationAttestation: { findUnique: jest.fn() },
    profileExport: { findUnique: jest.fn() },
    milestoneSubmission: { findUnique: jest.fn() },
  };

  const chainActions = {
    markFailed: jest.fn(),
    markDroppedReorg: jest.fn(),
    recordObservedReceipt: jest.fn(),
  };

  const anchoringQueue = { enqueue: jest.fn().mockResolvedValue({ status: "queued" }) };
  const orgRegistry = { verifyCreateOrgTx: jest.fn() };
  const indexer = { ingestRange: jest.fn().mockResolvedValue({ logs: 0, events: 0 }) };
  const eip712 = { hashTypedData: jest.fn().mockReturnValue("0x" + "11".repeat(32)) };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INDEXER_CHAIN_ID = "84532";
    process.env.INDEXER_ENABLED = "true";
    process.env.INDEXER_RPC_URL = "http://rpc";
    process.env.INDEXER_START_BLOCK = "0";
  });

  afterEach(() => {
    delete process.env.INDEXER_CHAIN_ID;
    delete process.env.INDEXER_ENABLED;
    delete process.env.INDEXER_RPC_URL;
    delete process.env.INDEXER_START_BLOCK;
  });

  it("clamps large backfills without force", async () => {
    process.env.ADMIN_INDEXER_MAX_RANGE = "5";
    const service = new AdminToolsService(
      prisma as any,
      chainActions as any,
      anchoringQueue as any,
      orgRegistry as any,
      indexer as any,
      eip712 as any,
    );
    await expect(
      service.backfillIndexer({ fromBlock: 0, toBlock: 20, chainId: 84532 }, false),
    ).rejects.toThrow("RANGE_TOO_LARGE");
    delete process.env.ADMIN_INDEXER_MAX_RANGE;
  });

  it("increments attempts on chain action retry", async () => {
    prisma.chainActionReceipt.findUnique.mockResolvedValue({
      id: "action-1",
      status: ChainActionStatus.PENDING,
      attempts: 1,
    });
    prisma.chainActionReceipt.update.mockResolvedValue({ id: "action-1", status: ChainActionStatus.PENDING });
    const service = new AdminToolsService(
      prisma as any,
      chainActions as any,
      anchoringQueue as any,
      orgRegistry as any,
      indexer as any,
      eip712 as any,
    );
    const result = await service.retryChainAction("action-1", false, false);
    expect(prisma.chainActionReceipt.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ attempts: { increment: 1 } }) }),
    );
    expect(result.dryRun).toBe(false);
  });

  it("records rebuild run when range requires force", async () => {
    prisma.projectionRebuildRun.create.mockResolvedValue({ id: "run-1" });
    const service = new AdminToolsService(
      prisma as any,
      chainActions as any,
      anchoringQueue as any,
      orgRegistry as any,
      indexer as any,
      eip712 as any,
    );
    await expect(
      service.rebuildProjections({ fromBlock: 10, toBlock: 20, chainId: 84532, projectorKeys: [] }, false),
    ).rejects.toThrow("RANGE_REQUIRES_FORCE");
    expect(prisma.projectionRebuildRun.create).toHaveBeenCalled();
    expect(prisma.projectionRebuildRun.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }),
    );
  });
});
