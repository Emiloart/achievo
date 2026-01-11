import { AdminCsrfGuard } from "../../src/admin-auth/admin-csrf.guard";

describe("AdminCsrfGuard", () => {
  const buildGuard = (overrides?: { jwt?: Partial<any>; prisma?: Partial<any>; adminAuth?: Partial<any> }) => {
    const jwt = { verify: jest.fn().mockReturnValue({ sid: "session-1" }), ...(overrides?.jwt || {}) };
    const prisma = {
      adminSession: {
        findUnique: jest.fn(),
      },
      ...(overrides?.prisma || {}),
    };
    const adminAuth = { validateCsrf: jest.fn().mockResolvedValue(true), ...(overrides?.adminAuth || {}) };
    const guard = new AdminCsrfGuard(jwt as any, prisma as any, adminAuth as any);
    return { guard, jwt, prisma, adminAuth };
  };

  it("rejects missing CSRF header", async () => {
    const { guard } = buildGuard();
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: "POST",
          headers: {
            cookie: "ach_admin_access=token; ach_admin_csrf=csrf",
          },
        }),
      }),
    };
    await expect(guard.canActivate(context)).rejects.toThrow("ADMIN_CSRF_INVALID");
  });

  it("accepts valid CSRF header and cookie", async () => {
    const { guard } = buildGuard();
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          method: "POST",
          headers: {
            cookie: "ach_admin_access=token; ach_admin_csrf=csrf",
            "x-ach-admin-csrf": "csrf",
          },
        }),
      }),
    };
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
