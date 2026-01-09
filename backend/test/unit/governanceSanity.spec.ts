jest.mock("viem", () => ({
  createPublicClient: jest.fn(),
  http: jest.fn(),
}));

import { createPublicClient } from "viem";
import { GovernanceSanityCheckService } from "../../src/governance/governance.service";

describe("GovernanceSanityCheckService", () => {
  const orgRegistry = {
    getRegistryAddressSafe: jest.fn().mockReturnValue("0xorg"),
    getRpcUrl: jest.fn().mockReturnValue("http://rpc"),
    getChainId: jest.fn().mockReturnValue(84532),
  };
  const anchoring = {
    getRegistryAddressSafe: jest.fn().mockReturnValue("0xanchor"),
    getRpcUrl: jest.fn().mockReturnValue("http://rpc"),
    getChainId: jest.fn().mockReturnValue(84532),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOVERNANCE_SANITY_CHECK_ENABLED = "true";
    process.env.TIMELOCK_ADDRESS = "0xtimelock";
    orgRegistry.getRegistryAddressSafe.mockReturnValue("0xorg");
    anchoring.getRegistryAddressSafe.mockReturnValue("0xanchor");
    anchoring.getRpcUrl.mockReturnValue("http://rpc");
    orgRegistry.getRpcUrl.mockReturnValue("http://rpc");
    anchoring.getChainId.mockReturnValue(84532);
    orgRegistry.getChainId.mockReturnValue(84532);
  });

  afterEach(() => {
    delete process.env.GOVERNANCE_SANITY_CHECK_ENABLED;
    delete process.env.TIMELOCK_ADDRESS;
    delete process.env.GOVERNANCE_STRICT;
  });

  it("passes when timelock controls org and anchor registries", async () => {
    const orgClient = { readContract: jest.fn().mockResolvedValue(true) };
    const anchorClient = {
      readContract: jest.fn().mockResolvedValueOnce("0xtimelock").mockResolvedValueOnce("0xtimelock"),
    };

    (createPublicClient as jest.Mock)
      .mockImplementationOnce(() => orgClient)
      .mockImplementationOnce(() => anchorClient);

    const service = new GovernanceSanityCheckService(orgRegistry as any, anchoring as any);
    await (service as any).runChecks();

    expect(orgClient.readContract).toHaveBeenCalled();
    expect(anchorClient.readContract).toHaveBeenCalled();
  });

  it("throws when strict mode and operator mismatch detected", async () => {
    process.env.GOVERNANCE_STRICT = "true";
    const orgClient = { readContract: jest.fn().mockResolvedValue(true) };
    const anchorClient = {
      readContract: jest.fn().mockResolvedValueOnce("0xtimelock").mockResolvedValueOnce("0xother"),
    };

    (createPublicClient as jest.Mock)
      .mockImplementationOnce(() => orgClient)
      .mockImplementationOnce(() => anchorClient);

    const service = new GovernanceSanityCheckService(orgRegistry as any, anchoring as any);
    await expect((service as any).runChecks()).rejects.toThrow(/AnchorRegistry operator mismatch/);
  });
});
