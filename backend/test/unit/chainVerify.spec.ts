import { ChainVerifyService } from "../../src/verify/chainVerify.service";

describe("ChainVerifyService", () => {
  it("falls back to isAnchored when records are unavailable", async () => {
    const service = new ChainVerifyService();
    (service as any).client = {
      readContract: jest
        .fn()
        .mockImplementationOnce(() => {
          throw new Error("records unavailable");
        })
        .mockResolvedValueOnce(true),
    };

    const result = await service.verifyAnchor({
      hash: "0x" + "11".repeat(32),
      contract: "0x0000000000000000000000000000000000000001",
    });

    expect(result.anchorPresent).toBe(true);
    expect(result.anchorVerified).toBe(true);
  });

  it("returns unknown when RPC calls fail", async () => {
    const service = new ChainVerifyService();
    (service as any).client = {
      getTransactionReceipt: jest.fn().mockRejectedValue(new Error("rpc down")),
      readContract: jest.fn().mockRejectedValue(new Error("rpc down")),
    };

    const result = await service.verifyAnchor({
      hash: "0x" + "22".repeat(32),
      contract: "0x0000000000000000000000000000000000000001",
      txHash: "0x" + "33".repeat(32),
    });

    expect(result.anchorVerified).toBe("unknown");
  });

  it("fails when receipt succeeds but no anchor event is found", async () => {
    const service = new ChainVerifyService();
    (service as any).client = {
      getTransactionReceipt: jest.fn().mockResolvedValue({ status: "success", logs: [] }),
    };

    const result = await service.verifyAnchorTx({
      txHash: "0x" + "44".repeat(32),
      contract: "0x0000000000000000000000000000000000000001",
    });

    expect(result.anchorPresent).toBe(false);
    expect(result.anchorVerified).toBe(false);
  });
});
