import { ChainActionStatus, ChainActionType } from "@prisma/client";
import { ChainActionsWorker } from "../../src/chain-actions/chain-actions.worker";

describe("ChainActionsWorker", () => {
  it("confirms pending actions and updates org status", async () => {
    const prisma = {
      chainActionReceipt: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: "action-1",
            chainId: 84532,
            type: ChainActionType.ORG_CREATE,
            txHash: "0xabc",
            status: ChainActionStatus.PENDING,
            confirmationsRequired: 2,
            metadata: { orgId: "org-1" },
          },
        ]),
      },
      chainCursor: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      organization: {
        update: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    const actions = {
      isEnabled: () => true,
      getConfirmationsRequired: () => 2,
      markConfirmed: jest.fn().mockResolvedValue({ finalizedAt: new Date("2025-01-01") }),
      markFailed: jest.fn(),
      markDroppedReorg: jest.fn(),
    };

    const worker = new ChainActionsWorker(prisma as any, actions as any);
    (worker as any).client = () => ({
      getTransactionReceipt: jest.fn().mockResolvedValue({
        status: "success",
        blockNumber: 100n,
        blockHash: "0xblock",
      }),
    });
    (worker as any).currentHead = jest.fn().mockResolvedValue(101);
    (worker as any).latestFinalized = jest.fn().mockResolvedValue(null);

    await worker.processPending();

    expect(actions.markConfirmed).toHaveBeenCalledWith("action-1", expect.any(Date));
    expect(prisma.organization.update).toHaveBeenCalledWith({
      where: { id: "org-1" },
      data: expect.objectContaining({ onchainStatus: "CONFIRMED" }),
    });
  });
});
