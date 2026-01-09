import { THROTTLER_LIMIT, THROTTLER_TTL } from "@nestjs/throttler/dist/throttler.constants";
import { OrganizationsController } from "../../src/organizations/organizations.controller";
import { VerifyController } from "../../src/verify/verify.controller";
import { AdminToolsController } from "../../src/admin-tools/admin-tools.controller";

describe("Throttle decorators", () => {
  it("applies throttling to org creation endpoints", () => {
    const limit = Reflect.getMetadata(THROTTLER_LIMIT + "default", OrganizationsController.prototype.prepare);
    const ttl = Reflect.getMetadata(THROTTLER_TTL + "default", OrganizationsController.prototype.prepare);
    expect(limit).toBeDefined();
    expect(ttl).toBeDefined();
  });

  it("applies throttling to verify endpoints", () => {
    const limit = Reflect.getMetadata(THROTTLER_LIMIT + "default", VerifyController.prototype.verifyProof);
    const ttl = Reflect.getMetadata(THROTTLER_TTL + "default", VerifyController.prototype.verifyProof);
    expect(limit).toBeDefined();
    expect(ttl).toBeDefined();
  });

  it("applies throttling to admin endpoints", () => {
    const limit = Reflect.getMetadata(THROTTLER_LIMIT + "default", AdminToolsController);
    const ttl = Reflect.getMetadata(THROTTLER_TTL + "default", AdminToolsController);
    expect(limit).toBeDefined();
    expect(ttl).toBeDefined();
  });
});
