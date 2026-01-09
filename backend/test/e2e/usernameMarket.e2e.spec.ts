import request from "supertest";
import { privateKeyToAccount } from "viem/accounts";
import { ensureBackend } from "./utils/harness";
import { loginAsWallet } from "./utils/auth";
import { claimUsernameOnchain, ensureIdentityRegistered, getUsernameOwner, mineBlocks } from "./utils/contracts";
import { waitUntil } from "./utils/waitUntil";
import { normalizeUsername } from "../../../packages/username";

function normalizeTypedMessage(message: any) {
  return {
    ...message,
    priceWei: BigInt(String(message.priceWei)),
    nonce: BigInt(String(message.nonce)),
    salt: BigInt(String(message.salt)),
    expiresAt: BigInt(String(message.expiresAt)),
  };
}

describe("E2E username market", () => {
  let runtime: any;
  let baseUrl = "";
  let sellerKey = "";
  let buyerKey = "";

  beforeAll(async () => {
    runtime = await ensureBackend();
    baseUrl = runtime.backend?.baseUrl || "";
    const seller =
      runtime.chain.accounts.find((account: { name: string }) => account.name === "user") ||
      runtime.chain.accounts[1];
    const buyer =
      runtime.chain.accounts.find((account: { name: string }) => account.name === "validator") ||
      runtime.chain.accounts[2];
    sellerKey = seller.privateKey;
    buyerKey = buyer.privateKey;
    await ensureIdentityRegistered(runtime.chain.rpcUrl, runtime.chain.chainId, runtime.deployments.identity, sellerKey);
    await ensureIdentityRegistered(runtime.chain.rpcUrl, runtime.chain.chainId, runtime.deployments.identity, buyerKey);
  });

  it("creates an ask, accepts it, and confirms transfer", async () => {
    const username = "e2euser";
    const { handleHash } = normalizeUsername(username);

    await claimUsernameOnchain({
      rpcUrl: runtime.chain.rpcUrl,
      chainId: runtime.chain.chainId,
      registry: runtime.deployments.usernameRegistry,
      username,
      privateKey: sellerKey,
    });

    const sellerAuth = await loginAsWallet(baseUrl, sellerKey);
    const buyerAuth = await loginAsWallet(baseUrl, buyerKey);

    const prepareRes = await request(baseUrl)
      .post("/usernames/orders/prepare")
      .set("Authorization", `Bearer ${sellerAuth.token}`)
      .send({ type: "ASK", name: username, priceWei: "1000000000000000" })
      .expect(201);

    const typedData = prepareRes.body?.data?.typedData;
    expect(typedData?.message).toBeTruthy();
    const sellerAccount = privateKeyToAccount(sellerKey as `0x${string}`);
    const signature = await sellerAccount.signTypedData({
      domain: typedData.domain,
      types: typedData.types,
      primaryType: typedData.primaryType,
      message: normalizeTypedMessage(typedData.message),
    });

    const orderRes = await request(baseUrl)
      .post("/usernames/orders")
      .set("Authorization", `Bearer ${sellerAuth.token}`)
      .send({ name: username, typedData, signature })
      .expect(201);

    const order = orderRes.body?.data;
    expect(order?.id).toBeTruthy();

    const acceptRes = await request(baseUrl)
      .post(`/usernames/orders/${order.id}/accept`)
      .set("Authorization", `Bearer ${buyerAuth.token}`);
    if (acceptRes.status !== 201) {
      throw new Error(`accept_order_failed: ${JSON.stringify(acceptRes.body)}`);
    }

    const trade = acceptRes.body?.data?.trade;
    expect(trade?.id).toBeTruthy();

    await mineBlocks(runtime.chain.rpcUrl, runtime.chain.chainId, 3);

    await waitUntil(
      async () => {
        const res = await request(baseUrl)
          .get(`/usernames/trades?handle=${username}`)
          .expect(200);
        const rows = res.body?.data || [];
        const match = rows.find((row: any) => row.id === trade.id);
        return match?.status === "CONFIRMED";
      },
      { timeoutMs: 30000, intervalMs: 1000, label: "username_trade_confirmed" },
    );

    const orderCheck = await request(baseUrl).get(`/usernames/orders/${order.id}`).expect(200);
    expect(orderCheck.body?.data?.status).toBe("FILLED");

    const buyerAddress = privateKeyToAccount(buyerKey as `0x${string}`).address.toLowerCase();
    const owner = await getUsernameOwner({
      rpcUrl: runtime.chain.rpcUrl,
      chainId: runtime.chain.chainId,
      registry: runtime.deployments.usernameRegistry,
      handleHash,
    });
    expect(owner).toBe(buyerAddress);
  });
});
