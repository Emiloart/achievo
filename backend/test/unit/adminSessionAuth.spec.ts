import { AdminAuthService } from "../../src/admin-auth/admin-auth.service";
import { AdminRole } from "@prisma/client";

describe("AdminAuthService (sessions)", () => {
  const baseAdmin = {
    id: "admin-1",
    email: "admin@example.com",
    role: AdminRole.ADMIN,
    isActive: true,
    lockedUntil: null,
    failedCount: 0,
    lastFailedAt: null,
    passwordHash: "hash",
  };

  const buildService = (overrides?: {
    prisma?: Partial<any>;
    jwt?: Partial<any>;
    config?: Partial<any>;
    password?: Partial<any>;
    audit?: Partial<any>;
  }) => {
    const prisma = {
      adminUser: {
        findUnique: jest.fn().mockResolvedValue(baseAdmin),
        update: jest.fn().mockResolvedValue(baseAdmin),
        create: jest.fn(),
      },
      adminSession: {
        create: jest.fn().mockResolvedValue({ id: "session-1" }),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      adminCsrfToken: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue({ id: "csrf-1" }),
      },
      ...(overrides?.prisma || {}),
    };
    const jwt = { sign: jest.fn().mockReturnValue("access-token"), ...(overrides?.jwt || {}) };
    const config = {
      get: jest.fn((key: string, fallback?: any) => fallback),
      ...(overrides?.config || {}),
    };
    const password = { verify: jest.fn().mockResolvedValue(true), hash: jest.fn(), ...(overrides?.password || {}) };
    const audit = { record: jest.fn(), ...(overrides?.audit || {}) };
    const service = new AdminAuthService(prisma as any, jwt as any, config as any, password as any, audit as any);
    return { service, prisma, jwt, password, audit, config };
  };

  it("issues tokens on login and writes an audit record", async () => {
    const { service, prisma, audit } = buildService();
    const result = await service.login({
      email: "admin@example.com",
      password: "secure-password",
      context: { ip: "127.0.0.1" },
    });

    expect(result.accessToken).toBe("access-token");
    expect(result.refreshToken).toBeTruthy();
    expect(prisma.adminSession.create).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ADMIN_LOGIN", adminUserId: baseAdmin.id }),
    );
  });

  it("locks the account after repeated failures", async () => {
    const lockedAdmin = { ...baseAdmin, failedCount: 4, lastFailedAt: new Date() };
    const { service, prisma, password, config } = buildService({
      prisma: {
        adminUser: {
          findUnique: jest.fn().mockResolvedValue(lockedAdmin),
          update: jest.fn().mockResolvedValue(lockedAdmin),
        },
      },
      password: { verify: jest.fn().mockResolvedValue(false) },
      config: {
        get: jest.fn((key: string, fallback?: any) => {
          if (key === "ADMIN_LOCKOUT_ATTEMPTS") return 5;
          if (key === "ADMIN_LOCKOUT_WINDOW_MIN") return 15;
          if (key === "ADMIN_LOCKOUT_DURATION_MIN") return 15;
          return fallback;
        }),
      },
    });

    await expect(
      service.login({ email: "admin@example.com", password: "wrong-password" }),
    ).rejects.toThrow("ADMIN_CREDENTIALS_INVALID");

    expect(password.verify).toHaveBeenCalled();
    expect(prisma.adminUser.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lockedUntil: expect.any(Date) }),
      }),
    );
  });

  it("rejects refresh reuse and revokes the family", async () => {
    const { service, prisma, audit } = buildService({
      prisma: {
        adminSession: {
          findUnique: jest.fn().mockResolvedValue({
            id: "session-1",
            adminUserId: baseAdmin.id,
            refreshFamilyId: "family-1",
            revokedAt: new Date(),
          }),
          updateMany: jest.fn(),
        },
        adminUser: {
          findUnique: jest.fn().mockResolvedValue(baseAdmin),
        },
      },
    });

    await expect(
      service.refresh({ refreshToken: "stale-token" }),
    ).rejects.toThrow("ADMIN_REFRESH_REUSED");

    expect(prisma.adminSession.updateMany).toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: "ADMIN_REFRESH_REUSE", adminUserId: baseAdmin.id }),
    );
  });
});
