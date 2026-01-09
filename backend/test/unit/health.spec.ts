jest.mock("../../src/chain/reliability/rpc.client", () => ({
  getRpcClient: jest.fn(),
}));

import { HealthService } from "../../src/health/health.service";
import { getRpcClient } from "../../src/chain/reliability/rpc.client";

describe("HealthService", () => {
  const prisma = {
    chainCursor: { findUnique: jest.fn() },
    anchorJob: { count: jest.fn() },
    chainActionReceipt: { count: jest.fn() },
    $queryRaw: jest.fn(),
  };
  const anchoring = {
    isEnabled: jest.fn().mockReturnValue(true),
    getRegistryAddressSafe: jest.fn().mockReturnValue("0xanchor"),
    getChainId: jest.fn().mockReturnValue(84532),
    getRpcUrl: jest.fn().mockReturnValue("http://rpc"),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ORG_CREATE_CHAIN_ID = "84532";
    process.env.ORG_CREATE_RPC_URL = "http://rpc";
    process.env.INDEXER_ENABLED = "true";
    process.env.INDEXER_CHAIN_ID = "84532";
    process.env.INDEXER_RPC_URL = "http://rpc";
    process.env.HEALTH_INDEXER_LAG_WARN_BLOCKS = "5";
    process.env.HEALTH_INDEXER_LAG_FAIL_BLOCKS = "10";
  });

  afterEach(() => {
    delete process.env.ORG_CREATE_CHAIN_ID;
    delete process.env.ORG_CREATE_RPC_URL;
    delete process.env.INDEXER_ENABLED;
    delete process.env.INDEXER_CHAIN_ID;
    delete process.env.INDEXER_RPC_URL;
    delete process.env.HEALTH_INDEXER_LAG_WARN_BLOCKS;
    delete process.env.HEALTH_INDEXER_LAG_FAIL_BLOCKS;
  });

  it("reports chain health as OK when RPC responds", async () => {
    (getRpcClient as jest.Mock).mockReturnValue({
      getBlockNumber: jest.fn().mockResolvedValue(100),
      readContract: jest.fn().mockResolvedValue(true),
    });
    const service = new HealthService(prisma as any, anchoring as any);
    const result = await service.getChainHealth();
    expect(result.status).toBe("OK");
  });

  it("marks indexer health as DOWN when lag exceeds threshold", async () => {
    (getRpcClient as jest.Mock).mockReturnValue({
      getBlockNumber: jest.fn().mockResolvedValue(100),
    });
    prisma.chainCursor.findUnique.mockResolvedValue({
      latestProcessedBlock: 89,
      latestFinalizedBlock: 80,
      updatedAt: new Date(),
    });
    const service = new HealthService(prisma as any, anchoring as any);
    const result = await service.getIndexerHealth();
    expect(result.status).toBe("DOWN");
    expect(result.lagBlocks).toBe(11);
  });

  it("marks anchoring health down when registry unreachable", async () => {
    (getRpcClient as jest.Mock).mockReturnValue({
      readContract: jest.fn().mockRejectedValue(new Error("rpc down")),
    });
    prisma.anchorJob.count.mockResolvedValue(0);
    prisma.chainActionReceipt.count.mockResolvedValue(0);
    const service = new HealthService(prisma as any, anchoring as any);
    const result = await service.getAnchoringHealth();
    expect(result.status).toBe("DOWN");
  });

  it("reports readiness when db and required rpc are healthy", async () => {
    process.env.ORG_CREATE_REQUIRED = "true";
    prisma.$queryRaw.mockResolvedValue([{ ok: 1 }]);
    (getRpcClient as jest.Mock).mockReturnValue({
      getBlockNumber: jest.fn().mockResolvedValue(100),
    });
    const service = new HealthService(prisma as any, anchoring as any);
    const result = await service.getReadiness();
    expect(result.ok).toBe(true);
    delete process.env.ORG_CREATE_REQUIRED;
  });
});
