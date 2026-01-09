import request from "supertest";
import { ensureBackend } from "./utils/harness";
import { signAdminRequest } from "./utils/admin";

describe("E2E admin auth", () => {
  it("signs admin requests with HMAC and rejects replay", async () => {
    const runtime = await ensureBackend();
    const baseUrl = runtime.backend?.baseUrl || "";

    const path = "/admin/chain-actions?limit=5";
    const headers = signAdminRequest({ runtime, method: "GET", path });

    const ok = await request(baseUrl).get(path).set(headers).expect(200);
    expect(ok.body?.success).toBe(true);

    await request(baseUrl).get(path).set(headers).expect(409);

    const badHeaders = { ...headers, "x-admin-sig": "deadbeef" };
    await request(baseUrl).get(path).set(badHeaders).expect(403);
  });
});
