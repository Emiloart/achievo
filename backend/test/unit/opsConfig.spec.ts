jest.mock("fs", () => {
  const actual = jest.requireActual("fs");
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(true),
    readdirSync: jest.fn().mockReturnValue(["a.json"]),
    readFileSync: jest.fn().mockReturnValue(Buffer.from("test")),
  };
});

jest.mock("../../src/chain/reliability/rpc.client", () => ({
  getRpcClient: jest.fn(),
}));

import { OpsConfigService } from "../../src/config/ops-config.service";
import { getRpcClient } from "../../src/chain/reliability/rpc.client";

describe("OpsConfigService", () => {
  const prisma = {
    operationalAlert: {
      create: jest.fn(),
    },
  };
  const orgRegistry = {
    getRegistryAddressSafe: jest.fn().mockReturnValue(null),
    getRpcUrl: jest.fn().mockReturnValue("http://rpc"),
    getChainId: jest.fn().mockReturnValue(84532),
  };
  const anchoring = {
    getRegistryAddressSafe: jest.fn().mockReturnValue(null),
    getRpcUrl: jest.fn().mockReturnValue("http://rpc"),
    getChainId: jest.fn().mockReturnValue(84532),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ORG_CREATE_REQUIRED = "false";
    process.env.ANCHORING_ENABLED = "false";
    process.env.DEPLOYMENTS_HASH_BASE_SEPOLIA = "mismatch";
    process.env.DEPLOYMENT_COMPAT_CHECK_ENABLED = "false";
    process.env.CONFIG_STRICT = "false";
  });

  afterEach(() => {
    delete process.env.ORG_CREATE_REQUIRED;
    delete process.env.ANCHORING_ENABLED;
    delete process.env.DEPLOYMENTS_HASH_BASE_SEPOLIA;
    delete process.env.DEPLOYMENT_COMPAT_CHECK_ENABLED;
    delete process.env.CONFIG_STRICT;
  });

  it("creates alert on deployment hash mismatch", async () => {
    const service = new OpsConfigService(prisma as any, orgRegistry as any, anchoring as any);
    await service.onModuleInit();
    expect(prisma.operationalAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "CONFIG_MISMATCH" }),
      }),
    );
  });

  it("creates alert on compatibility mismatch", async () => {
    process.env.DEPLOYMENT_COMPAT_CHECK_ENABLED = "true";
    orgRegistry.getRegistryAddressSafe.mockReturnValue("0xorg");
    anchoring.getRegistryAddressSafe.mockReturnValue("0xanchor");
    (getRpcClient as jest.Mock).mockReturnValue({
      getChainId: jest.fn().mockResolvedValue(999),
      getBytecode: jest.fn().mockResolvedValue("0x"),
      readContract: jest.fn().mockResolvedValue(true),
    });

    const service = new OpsConfigService(prisma as any, orgRegistry as any, anchoring as any);
    await service.onModuleInit();
    expect(prisma.operationalAlert.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "CONFIG_MISMATCH" }),
      }),
    );
  });
});
