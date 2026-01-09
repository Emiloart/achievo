import { OrgGuard } from "../../src/org-rbac/org-rbac.guard";
import { OrgRole } from "@prisma/client";

describe("OrgGuard RBAC", () => {
  const buildContext = (request: any) => ({
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  });

  it("denies non-members", async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ userId: "ACHUSR-1" }) },
      orgMember: { findUnique: jest.fn().mockResolvedValue(null) },
    } as any;
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([OrgRole.ADMIN]) } as any;
    const guard = new OrgGuard(prisma, reflector);

    const ctx = buildContext({ params: { orgId: "org-1" }, user: { sub: "user-1" } });

    await expect(guard.canActivate(ctx as any)).rejects.toThrow("NOT_MEMBER");
  });

  it("denies insufficient role", async () => {
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue({ userId: "ACHUSR-2" }) },
      orgMember: { findUnique: jest.fn().mockResolvedValue({ role: OrgRole.MEMBER }) },
    } as any;
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue([OrgRole.ADMIN]) } as any;
    const guard = new OrgGuard(prisma, reflector);

    const ctx = buildContext({ params: { orgId: "org-2" }, user: { sub: "user-2" } });

    await expect(guard.canActivate(ctx as any)).rejects.toThrow("INSUFFICIENT_ROLE");
  });
});
