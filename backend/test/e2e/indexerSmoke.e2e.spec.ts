import request from "supertest";
import { ensureBackend, getRuntime } from "./utils/harness";
import { signAdminRequest } from "./utils/admin";
import { prismaClient, disconnectPrisma } from "./utils/prisma";
import { publicClient } from "./utils/contracts";

describe("E2E indexer idempotency", () => {
  afterAll(async () => {
    await disconnectPrisma();
  });

  it("replays same range without duplicates", async () => {
    const runtime = await ensureBackend();
    const baseUrl = runtime.backend?.baseUrl || "";
    const client = publicClient(runtime.chain.rpcUrl, runtime.chain.chainId);
    const head = Number(await client.getBlockNumber());
    const fromBlock = Math.max(head - 5, 0);
    const toBlock = head;

    const payload = { fromBlock, toBlock, chainId: runtime.chain.chainId };
    const path = "/admin/indexer/backfill";

    const headers1 = signAdminRequest({ runtime, method: "POST", path, body: payload });
    await request(baseUrl).post(path).set(headers1).send(payload).expect(201);

    const prisma = prismaClient();
    const firstLogs = await prisma.chainLog.count({ where: { chainId: runtime.chain.chainId } });
    const firstEvents = await prisma.decodedEvent.count({ where: { chainId: runtime.chain.chainId } });

    const headers2 = signAdminRequest({ runtime, method: "POST", path, body: payload });
    await request(baseUrl).post(path).set(headers2).send(payload).expect(201);

    const secondLogs = await prisma.chainLog.count({ where: { chainId: runtime.chain.chainId } });
    const secondEvents = await prisma.decodedEvent.count({ where: { chainId: runtime.chain.chainId } });

    expect(secondLogs).toBe(firstLogs);
    expect(secondEvents).toBe(firstEvents);
  });
});
