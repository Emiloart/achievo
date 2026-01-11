import request from "supertest";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { ensureBackend } from "./utils/harness";

function parseCookie(setCookie: string[], name: string) {
  const cookie = setCookie.find((entry) => entry.startsWith(`${name}=`));
  if (!cookie) return "";
  return cookie.split(";")[0]?.split("=")[1] || "";
}

describe("E2E admin gateway", () => {
  let baseUrl = "";
  let runtime: any;

  beforeAll(async () => {
    runtime = await ensureBackend();
    baseUrl = runtime.backend?.baseUrl || "";
    const prisma = new PrismaClient({ datasources: { db: { url: runtime.db.databaseUrl } } });
    const passwordHash = await argon2.hash("AdminPassw0rd!!", { type: argon2.argon2id });
    await prisma.adminUser.create({
      data: {
        email: "superadmin@example.com",
        passwordHash,
        role: "SUPERADMIN",
        isActive: true,
      },
    });
    await prisma.$disconnect();
  });

  it("logs in and runs a dry-run + execute", async () => {
    const loginRes = await request(baseUrl)
      .post("/admin-auth/login")
      .send({ email: "superadmin@example.com", password: "AdminPassw0rd!!" })
      .expect(201);

    const setCookie = loginRes.headers["set-cookie"] as string[] | undefined;
    expect(setCookie?.length).toBeGreaterThan(0);
    const access = parseCookie(setCookie || [], "ach_admin_access");
    const refresh = parseCookie(setCookie || [], "ach_admin_refresh");
    const csrf = parseCookie(setCookie || [], "ach_admin_csrf");
    const cookieHeader = `ach_admin_access=${access}; ach_admin_refresh=${refresh}; ach_admin_csrf=${csrf}`;

    await request(baseUrl).get("/admin-gateway/overview").set("Cookie", cookieHeader).expect(200);

    const payload = {
      action: "indexer_backfill",
      payload: {
        fromBlock: 0,
        toBlock: 1,
        chainId: runtime.chain.chainId,
      },
    };

    const dryRes = await request(baseUrl)
      .post("/admin-gateway/dry-run")
      .set("Cookie", cookieHeader)
      .set("x-ach-admin-csrf", csrf)
      .send(payload)
      .expect(201);

    const intentId = dryRes.body?.intentId as string;
    const confirmPhrase = dryRes.body?.confirmPhrase as string;
    expect(intentId).toBeTruthy();
    expect(confirmPhrase).toBeTruthy();

    await request(baseUrl)
      .post("/admin-gateway/execute")
      .set("Cookie", cookieHeader)
      .set("x-ach-admin-csrf", csrf)
      .send({ intentId, confirmPhrase, payload: payload.payload })
      .expect(201);

    const auditRes = await request(baseUrl)
      .get("/admin-gateway/audit?action=EXECUTE:indexer_backfill&limit=5")
      .set("Cookie", cookieHeader)
      .expect(200);

    expect(auditRes.body?.length).toBeGreaterThan(0);
  });
});
