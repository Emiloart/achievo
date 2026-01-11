import { AdminIntentService } from "../../src/admin-gateway/admin-intent.service";

describe("AdminIntentService", () => {
  const buildService = (overrides?: Partial<any>) => {
    const prisma = {
      adminActionIntent: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      ...(overrides || {}),
    };
    const service = new AdminIntentService(prisma as any);
    return { service, prisma };
  };

  it("creates an intent with a payload hash", async () => {
    const { service, prisma } = buildService();
    prisma.adminActionIntent.create.mockImplementation(({ data }: any) => Promise.resolve({ id: "intent-1", ...data }));
    const intent = await service.createIntent({
      adminUserId: "admin-1",
      action: "chain_action_retry",
      payload: { id: "action-1" },
      confirmPhrase: "EXECUTE",
      ttlMinutes: 5,
    });
    expect(intent.payloadHash).toBe(service.computePayloadHash("chain_action_retry", { id: "action-1" }));
  });

  it("rejects mismatched payloads", async () => {
    const { service, prisma } = buildService();
    prisma.adminActionIntent.findUnique.mockResolvedValue({
      id: "intent-1",
      adminUserId: "admin-1",
      action: "chain_action_retry",
      payloadHash: service.computePayloadHash("chain_action_retry", { id: "action-1" }),
      confirmPhrase: "EXECUTE",
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: null,
    });
    await expect(
      service.consumeIntent({
        adminUserId: "admin-1",
        intentId: "intent-1",
        payload: { id: "different" },
        confirmPhrase: "EXECUTE",
      }),
    ).rejects.toThrow("ADMIN_INTENT_PAYLOAD_MISMATCH");
  });
});
