import request from "supertest";
import { ensureBackend } from "./utils/harness";
import { loginAsWallet } from "./utils/auth";
import { createOrgOnchain, ensureIdentityRegistered, mineBlocks, readOrgCreateFee } from "./utils/contracts";
import { signAdminRequest } from "./utils/admin";
import { waitUntil } from "./utils/waitUntil";
import { ORG_HANDLE } from "./fixtures/seed";

describe("E2E org gating", () => {
  let baseUrl = "";
  let runtime: any;
  let token = "";
  let userKey = "";

  beforeAll(async () => {
    runtime = await ensureBackend();
    baseUrl = runtime.backend?.baseUrl || "";
    const user =
      runtime.chain.accounts.find((account: { name: string }) => account.name === "user") ||
      runtime.chain.accounts[1];
    userKey = user.privateKey;
    await ensureIdentityRegistered(runtime.chain.rpcUrl, runtime.chain.chainId, runtime.deployments.identity, userKey);
    const login = await loginAsWallet(baseUrl, userKey);
    token = login.token;
  });

  it("creates org on-chain and confirms", async () => {
    const prepareRes = await request(baseUrl)
      .post("/orgs/prepare")
      .set("X-Forwarded-For", "127.0.0.1")
      .send({ handle: ORG_HANDLE })
      .expect(201);

    expect(prepareRes.body?.success).toBe(true);
    const registry = prepareRes.body?.data?.registry as string;
    expect(registry?.toLowerCase()).toBe(runtime.deployments.orgRegistry.toLowerCase());

    const feeRaw = prepareRes.body?.data?.fee as string | null;
    const fee = feeRaw ? BigInt(feeRaw) : await readOrgCreateFee(runtime.chain.rpcUrl, runtime.chain.chainId, registry);

    const txHash = await createOrgOnchain({
      rpcUrl: runtime.chain.rpcUrl,
      chainId: runtime.chain.chainId,
      orgRegistry: registry,
      handle: ORG_HANDLE,
      privateKey: userKey,
      feeWei: fee,
    });

    const createRes = await request(baseUrl)
      .post("/orgs")
      .set("Authorization", `Bearer ${token}`)
      .set("X-Forwarded-For", "127.0.0.1")
      .send({
        handle: ORG_HANDLE,
        displayName: "E2E Org",
        creationTxHash: txHash,
      })
      .expect(201);

    expect(createRes.body?.success).toBe(true);
    expect(createRes.body?.data?.onchainStatus).toBe("PENDING_CONFIRMATIONS");

    await mineBlocks(runtime.chain.rpcUrl, runtime.chain.chainId, 3);

    await waitUntil(
      async () => {
        const res = await request(baseUrl).get(`/orgs/${ORG_HANDLE}`).expect(200);
        return res.body?.data?.org?.onchainStatus === "CONFIRMED";
      },
      { timeoutMs: 30000, intervalMs: 1000, label: "org_confirmed" },
    );

    const path = `/admin/chain-actions?type=ORG_CREATE&chainId=${runtime.chain.chainId}&limit=50`;
    await waitUntil(
      async () => {
        const headers = signAdminRequest({ runtime, method: "GET", path });
        const res = await request(baseUrl).get(path).set(headers).expect(200);
        const rows = res.body?.data || [];
        return rows.some((row: any) =>
          row.txHash?.toLowerCase() === String(txHash).toLowerCase() && row.status === "CONFIRMED",
        );
      },
      { timeoutMs: 30000, intervalMs: 1000, label: "org_chain_action_confirmed" },
    );
  });
});
