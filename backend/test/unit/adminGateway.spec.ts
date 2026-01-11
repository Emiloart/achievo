import { AdminGatewayService } from "../../src/admin-gateway/admin-gateway.service";
import { AdminRole } from "@prisma/client";

describe("AdminGatewayService", () => {
  const buildService = (overrides?: Partial<any>) => {
    const prisma = {
      chainActionReceipt: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn() },
      anchorJob: { count: jest.fn().mockResolvedValue(0) },
      operationalAlert: { groupBy: jest.fn().mockResolvedValue([]) },
      projectionRebuildRun: { findMany: jest.fn().mockResolvedValue([]) },
      organization: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn() },
      userRiskProfile: { findUnique: jest.fn() },
      userConsistencyScore: { findUnique: jest.fn() },
      username: { findMany: jest.fn().mockResolvedValue([]) },
      usernameOrder: { findMany: jest.fn().mockResolvedValue([]) },
      usernameTrade: { findMany: jest.fn().mockResolvedValue([]) },
      adminUser: { findMany: jest.fn().mockResolvedValue([]) },
      adminAuditLog: { findMany: jest.fn().mockResolvedValue([]) },
      ...(overrides?.prisma || {}),
    };
    const adminTools = { retryChainAction: jest.fn().mockResolvedValue({ dryRun: true }) };
    const chainActions = { list: jest.fn().mockResolvedValue([]), getById: jest.fn() };
    const anchoring = { isEnabled: jest.fn().mockReturnValue(true), getChainId: jest.fn().mockReturnValue(1), getRegistryAddressSafe: jest.fn().mockReturnValue("0xabc") };
    const health = {
      getChainHealth: jest.fn().mockResolvedValue({ status: "OK" }),
      getIndexerHealth: jest.fn().mockResolvedValue({ status: "OK" }),
      getAnchoringHealth: jest.fn().mockResolvedValue({ status: "OK" }),
      getReadiness: jest.fn().mockResolvedValue({ status: "OK" }),
    };
    const audit = { record: jest.fn() };
    const intents = { createIntent: jest.fn().mockResolvedValue({ id: "intent-1", confirmPhrase: "EXECUTE", expiresAt: new Date() }) };
    const adminAuth = { createAdminUser: jest.fn(), updateAdminUser: jest.fn() };
    const service = new AdminGatewayService(
      prisma as any,
      adminTools as any,
      chainActions as any,
      anchoring as any,
      health as any,
      audit as any,
      intents as any,
      adminAuth as any,
    );
    return { service, adminTools, audit, intents };
  };

  it("rejects actions when role is insufficient", async () => {
    const { service } = buildService();
    await expect(
      service.dryRun("chain_action_retry", { id: "a1" }, { id: "admin-1", role: AdminRole.VIEWER }, {}),
    ).rejects.toThrow("ADMIN_ROLE_FORBIDDEN");
  });

  it("creates intent and audit record on dry-run", async () => {
    const { service, adminTools, audit, intents } = buildService();
    const result = await service.dryRun(
      "chain_action_retry",
      { id: "a1", force: false },
      { id: "admin-1", role: AdminRole.OPERATOR },
      { requestId: "req-1" },
    );
    expect(adminTools.retryChainAction).toHaveBeenCalledWith("a1", false, true);
    expect(intents.createIntent).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: "DRY_RUN:chain_action_retry" }));
    expect(result.intentId).toBe("intent-1");
  });
});
