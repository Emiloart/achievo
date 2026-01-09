import { OrganizationsService } from "../../src/organizations/organizations.service";
import { hashHandle } from "../../src/organizations/handle.util";
import { ChainActionType } from "@prisma/client";

describe("OrganizationsService org creation gating", () => {
  const buildService = (overrides?: {
    orgRegistry?: Partial<{
      isRequired: () => boolean;
      getRegistryAddressSafe: () => string | null;
      verifyCreateOrgTx: (params: any) => Promise<any>;
    }>;
    prisma?: Partial<any>;
  }) => {
    const organizationCreate = jest.fn().mockResolvedValue({ id: "org-1" });
    const orgMemberCreate = jest.fn().mockResolvedValue({ id: "member-1" });
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ primaryWallet: "0xabc" }) },
      organization: { findFirst: jest.fn().mockResolvedValue(null) },
      $transaction: jest.fn(async (fn: any) =>
        fn({
          organization: { create: organizationCreate },
          orgMember: { create: orgMemberCreate },
        }),
      ),
      ...(overrides?.prisma || {}),
    };

    const orgRegistry = {
      isRequired: () => false,
      getRegistryAddressSafe: () => null,
      verifyCreateOrgTx: jest.fn(),
      ...(overrides?.orgRegistry || {}),
    };

    const chainActions = { recordObservedReceipt: jest.fn().mockResolvedValue({}) };
    const service = new OrganizationsService(
      prisma as any,
      { getSummaries: jest.fn() } as any,
      { log: jest.fn() } as any,
      orgRegistry as any,
      chainActions as any,
    );

    return { service, prisma, orgRegistry, organizationCreate, orgMemberCreate, chainActions };
  };

  it("requires on-chain tx when gating is enabled", async () => {
    const { service } = buildService({
      orgRegistry: { isRequired: () => true },
    });
    await expect(service.createOrg("ACHUSR-1", { handle: "org-one", displayName: "Org One" })).rejects.toThrow(
      "ORG_CREATION_TX_REQUIRED",
    );
  });

  it("stores on-chain metadata when verified", async () => {
    const chainInfo = {
      txHash: "0xabc123",
      handleHash: "0xdeadbeef",
      creator: "0xabc",
      createdAt: 1700000000,
      chainId: 84532,
      blockNumber: 100,
      blockHash: "0xblock",
    };
    const { service, orgRegistry, organizationCreate, chainActions } = buildService({
      orgRegistry: {
        isRequired: () => true,
        verifyCreateOrgTx: jest.fn().mockResolvedValue(chainInfo),
      },
    });

    await service.createOrg("ACHUSR-1", {
      handle: "org-one",
      displayName: "Org One",
      creationTxHash: chainInfo.txHash,
    });

    expect(orgRegistry.verifyCreateOrgTx).toHaveBeenCalled();
    const data = organizationCreate.mock.calls[0][0].data;
    expect(data.chainId).toBe(chainInfo.chainId);
    expect(data.creationTxHash).toBe(chainInfo.txHash);
    expect(data.handleHash).toBe(chainInfo.handleHash);
    expect(data.onchainCreator).toBe(chainInfo.creator);
    expect(data.onchainStatus).toBe("PENDING_CONFIRMATIONS");
    expect(chainActions.recordObservedReceipt).toHaveBeenCalledWith(
      ChainActionType.ORG_CREATE,
      chainInfo.chainId,
      chainInfo.txHash,
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
      expect.any(Object),
    );
  });

  it("allows off-chain creation when gating is disabled", async () => {
    const { service, organizationCreate } = buildService({
      orgRegistry: { isRequired: () => false },
    });

    await service.createOrg("ACHUSR-1", { handle: "org-two", displayName: "Org Two" });

    const data = organizationCreate.mock.calls[0][0].data;
    expect(data.chainId).toBeNull();
    expect(data.creationTxHash).toBeNull();
    expect(data.onchainCreator).toBeNull();
    expect(data.handleHash).toBe(hashHandle("org-two").toLowerCase());
  });

  it("maps unique handle conflicts to a friendly error", async () => {
    const { service, prisma } = buildService({
      orgRegistry: { isRequired: () => false },
      prisma: {
        $transaction: jest.fn(async () => {
          const error: any = new Error("unique");
          error.code = "P2002";
          error.meta = { target: ["handle"] };
          throw error;
        }),
      },
    });

    await expect(service.createOrg("ACHUSR-1", { handle: "org-dupe", displayName: "Org Dupe" })).rejects.toThrow(
      "ORG_HANDLE_TAKEN",
    );
  });
});
