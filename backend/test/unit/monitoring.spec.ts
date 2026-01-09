import { MonitoringService } from "../../src/monitoring/monitoring.service";

jest.mock("../../src/chain/reliability/rpc.client", () => ({
  getRpcClient: jest.fn(),
  getRpcClientSnapshots: jest.fn().mockReturnValue([]),
}));

describe("MonitoringService", () => {
  const prisma = {
    chainActionReceipt: { count: jest.fn() },
    anchorJob: { count: jest.fn() },
    chainCursor: { findUnique: jest.fn() },
    operationalAlert: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HEALTH_PENDING_CHAIN_ACTIONS_WARN = "1";
    process.env.HEALTH_PENDING_CHAIN_ACTIONS_FAIL = "10";
    process.env.HEALTH_STUCK_ACTION_AGE_MINUTES = "1";
    process.env.MONITORING_DEDUPE_MINUTES = "0";
    process.env.INDEXER_ENABLED = "false";
  });

  afterEach(() => {
    delete process.env.HEALTH_PENDING_CHAIN_ACTIONS_WARN;
    delete process.env.HEALTH_PENDING_CHAIN_ACTIONS_FAIL;
    delete process.env.HEALTH_STUCK_ACTION_AGE_MINUTES;
    delete process.env.MONITORING_DEDUPE_MINUTES;
    delete process.env.INDEXER_ENABLED;
  });

  it("creates alerts when stuck chain actions exceed threshold", async () => {
    prisma.chainActionReceipt.count.mockResolvedValue(2);
    prisma.anchorJob.count.mockResolvedValue(0);
    const service = new MonitoringService(prisma as any);
    await service.run();
    expect(prisma.operationalAlert.create).toHaveBeenCalled();
  });
});
