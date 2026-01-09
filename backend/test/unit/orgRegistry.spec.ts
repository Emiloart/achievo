jest.mock("viem", () => ({
  decodeEventLog: jest.fn(),
  decodeFunctionData: jest.fn(),
}));

jest.mock("../../src/chain/reliability/rpc.client", () => ({
  getRpcClient: jest.fn(),
}));

import { decodeEventLog, decodeFunctionData } from "viem";
import { getRpcClient } from "../../src/chain/reliability/rpc.client";
import { OrgRegistryService } from "../../src/organizations/orgRegistry.service";

describe("OrgRegistryService", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    process.env.ORG_REGISTRY_ADDRESS = "0xorg";
    process.env.ORG_CREATE_CHAIN_ID = "84532";
    process.env.ORG_CREATE_RPC_URL = "http://rpc";
  });

  afterEach(() => {
    delete process.env.ORG_REGISTRY_ADDRESS;
    delete process.env.ORG_CREATE_CHAIN_ID;
    delete process.env.ORG_CREATE_RPC_URL;
  });

  it("rejects when OrgCreated event is missing", async () => {
    const client = {
      getTransaction: jest.fn().mockResolvedValue({
        to: "0xorg",
        input: "0xinput",
        value: 10n,
      }),
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: "success",
        to: "0xorg",
        from: "0xcreator",
        logs: [{ address: "0xorg", data: "0x", topics: [], logIndex: 0n }],
        blockNumber: 10n,
        blockHash: "0xblock",
      }),
      readContract: jest.fn().mockResolvedValue(1n),
    };

    (getRpcClient as jest.Mock).mockReturnValue(client);
    (decodeFunctionData as jest.Mock).mockReturnValue({ functionName: "createOrg", args: ["org-handle"] });
    (decodeEventLog as jest.Mock).mockImplementation(() => {
      throw new Error("no match");
    });

    const service = new OrgRegistryService();
    await expect(
      service.verifyCreateOrgTx({
        txHash: "0xtx",
        handle: "org-handle",
        creator: "0xcreator",
      }),
    ).rejects.toThrow("ORG_EVENT_NOT_FOUND");
  });
});
