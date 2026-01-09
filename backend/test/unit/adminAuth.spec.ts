import { AdminAuthService } from "../../src/security/adminAuth/admin-auth.service";
import { createHmac, createHash } from "crypto";

function sha256Hex(data: string) {
  return createHash("sha256").update(data).digest("hex");
}

function sign(secret: string, payload: string) {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

describe("AdminAuthService", () => {
  const prisma = {
    adminRequestNonce: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_API_KEY = "admin-key";
    process.env.ADMIN_HMAC_SECRET = "admin-secret";
    process.env.ADMIN_TS_SKEW_SECONDS = "120";
  });

  afterEach(() => {
    delete process.env.ADMIN_API_KEY;
    delete process.env.ADMIN_HMAC_SECRET;
    delete process.env.ADMIN_TS_SKEW_SECONDS;
  });

  it("rejects missing headers", async () => {
    const service = new AdminAuthService(prisma as any);
    await expect(service.verifyRequest({ headers: {} })).rejects.toThrow("ADMIN_KEY_INVALID");
  });

  it("rejects invalid signature", async () => {
    const service = new AdminAuthService(prisma as any);
    const ts = Math.floor(Date.now() / 1000).toString();
    const payload = `GET\n/admin/alerts\n${ts}\nnonce\n${sha256Hex("")}`;
    const sig = sign("wrong-secret", payload);
    const req = {
      method: "GET",
      originalUrl: "/admin/alerts",
      headers: {
        "x-admin-key": "admin-key",
        "x-admin-ts": ts,
        "x-admin-nonce": "nonce",
        "x-admin-sig": sig,
      },
    };
    await expect(service.verifyRequest(req)).rejects.toThrow("ADMIN_SIGNATURE_INVALID");
  });

  it("rejects replayed nonce", async () => {
    const service = new AdminAuthService(prisma as any);
    prisma.adminRequestNonce.create.mockRejectedValue({ code: "P2002" });
    const ts = Math.floor(Date.now() / 1000).toString();
    const payload = `GET\n/admin/alerts\n${ts}\nnonce\n${sha256Hex("")}`;
    const sig = sign("admin-secret", payload);
    const req = {
      method: "GET",
      originalUrl: "/admin/alerts",
      headers: {
        "x-admin-key": "admin-key",
        "x-admin-ts": ts,
        "x-admin-nonce": "nonce",
        "x-admin-sig": sig,
      },
      body: undefined,
    };
    await expect(service.verifyRequest(req)).rejects.toThrow("ADMIN_NONCE_REPLAY");
  });

  it("rejects old timestamp", async () => {
    const service = new AdminAuthService(prisma as any);
    const ts = (Math.floor(Date.now() / 1000) - 1000).toString();
    const payload = `GET\n/admin/alerts\n${ts}\nnonce\n${sha256Hex("")}`;
    const sig = sign("admin-secret", payload);
    const req = {
      method: "GET",
      originalUrl: "/admin/alerts",
      headers: {
        "x-admin-key": "admin-key",
        "x-admin-ts": ts,
        "x-admin-nonce": "nonce",
        "x-admin-sig": sig,
      },
      body: undefined,
    };
    await expect(service.verifyRequest(req)).rejects.toThrow("ADMIN_TIMESTAMP_SKEW");
  });
});
