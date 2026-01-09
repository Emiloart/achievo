import request from "supertest";
import { privateKeyToAccount } from "viem/accounts";

const DEFAULT_IP = "127.0.0.1";

export async function loginAsWallet(baseUrl: string, privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const nonceRes = await request(baseUrl)
    .post("/auth/nonce")
    .set("X-Forwarded-For", DEFAULT_IP)
    .send({ address: account.address })
    .expect(201);

  const nonce = nonceRes.body?.nonce as string;
  const message = nonceRes.body?.message as string;
  const signature = await account.signMessage({ message });

  const verifyRes = await request(baseUrl)
    .post("/auth/verify")
    .set("X-Forwarded-For", DEFAULT_IP)
    .send({ address: account.address, signature, nonce })
    .expect(201);

  return {
    token: verifyRes.body?.token as string,
    user: verifyRes.body?.user,
    address: account.address,
  };
}
