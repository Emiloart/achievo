import request from "supertest";
import { ensureBackend } from "./utils/harness";

describe("E2E health endpoints", () => {
  it("returns health snapshots", async () => {
    const runtime = await ensureBackend();
    const baseUrl = runtime.backend?.baseUrl || "";

    const live = await request(baseUrl).get("/health").expect(200);
    expect(live.body?.ok).toBe(true);

    const ready = await request(baseUrl).get("/ready").expect(200);
    expect([true, false]).toContain(ready.body?.ok);

    const chain = await request(baseUrl).get("/health/chain").expect(200);
    expect(["OK", "DEGRADED", "DOWN"]).toContain(chain.body?.status);
    expect(Array.isArray(chain.body?.checks)).toBe(true);

    const indexer = await request(baseUrl).get("/health/indexer").expect(200);
    expect(["OK", "DEGRADED", "DOWN"]).toContain(indexer.body?.status);
    expect(indexer.body?.enabled).toBe(true);

    const anchoring = await request(baseUrl).get("/health/anchoring").expect(200);
    expect(["OK", "DEGRADED", "DOWN"]).toContain(anchoring.body?.status);
    expect(anchoring.body?.enabled).toBe(true);
  });
});
