import request from "supertest";
import { ensureBackend, restartBackendForE2E } from "./utils/harness";
import { loginAsWallet } from "./utils/auth";
import { ensureIdentityRegistered } from "./utils/contracts";
import { waitUntil } from "./utils/waitUntil";

describe("E2E verification fallback", () => {
  it("returns unknown on RPC failure", async () => {
    let runtime = await ensureBackend();
    let baseUrl = runtime.backend?.baseUrl || "";

    const user = runtime.chain.accounts.find((account: any) => account.name === "user") || runtime.chain.accounts[1];
    await ensureIdentityRegistered(runtime.chain.rpcUrl, runtime.chain.chainId, runtime.deployments.identity, user.privateKey);
    const login = await loginAsWallet(baseUrl, user.privateKey);

    const proofRes = await request(baseUrl)
      .post("/proofs/url")
      .set("Authorization", `Bearer ${login.token}`)
      .send({ sourceUrl: "https://example.com/proof-unknown", anchor: true })
      .expect(201);

    const proofId = proofRes.body?.data?.id as string;
    expect(proofId).toBeTruthy();

    await waitUntil(
      async () => {
        const res = await request(baseUrl)
          .get(`/proofs/${proofId}`)
          .set("Authorization", `Bearer ${login.token}`)
          .expect(200);
        return Boolean(res.body?.data?.anchorTxHash);
      },
      { timeoutMs: 60000, intervalMs: 2000, label: "proof_anchor_tx" },
    );

    runtime = await restartBackendForE2E({ rpcFailMode: true });
    baseUrl = runtime.backend?.baseUrl || "";

    const verifyUnknown = await request(baseUrl).get(`/verify/proof/${proofId}`).expect(200);
    expect(verifyUnknown.body?.anchorVerified).toBe("unknown");

    runtime = await restartBackendForE2E({ rpcFailMode: false });
    baseUrl = runtime.backend?.baseUrl || "";

    const verifyOk = await request(baseUrl).get(`/verify/proof/${proofId}`).expect(200);
    expect(verifyOk.body?.anchorVerified).toBe(true);
  });
});
