import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { achievoOrgRegistryAbi, achievoUsernameRegistryV1Abi } from "../../../../packages/achievo-abi";

const identityAbi = [
  {
    inputs: [],
    name: "register",
    outputs: [{ internalType: "uint96", name: "userId", type: "uint96" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "wallet", type: "address" }],
    name: "getUserId",
    outputs: [{ internalType: "uint96", name: "", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },
];

function chainFor(chainId: number, rpcUrl: string) {
  return {
    id: chainId,
    name: "E2E",
    nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [rpcUrl] } },
  } as const;
}

export function publicClient(rpcUrl: string, chainId: number) {
  return createPublicClient({ transport: http(rpcUrl), chain: chainFor(chainId, rpcUrl) });
}

export function walletClient(rpcUrl: string, chainId: number, privateKey: string) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  return createWalletClient({ transport: http(rpcUrl), chain: chainFor(chainId, rpcUrl), account });
}

export async function mineBlocks(rpcUrl: string, chainId: number, count: number) {
  const client = publicClient(rpcUrl, chainId);
  const total = Math.max(1, Math.floor(count));
  const request = (method: string, params?: unknown[]) =>
    (client as unknown as { request: (payload: { method: string; params?: unknown[] }) => Promise<unknown> }).request({
      method,
      params,
    });
  try {
    await request("anvil_mine", [total]);
    return;
  } catch {
    // ignore
  }
  try {
    await request("hardhat_mine", ["0x" + total.toString(16)]);
    return;
  } catch {
    // ignore
  }
  for (let i = 0; i < total; i += 1) {
    await request("evm_mine", []);
  }
}

export async function ensureIdentityRegistered(
  rpcUrl: string,
  chainId: number,
  identityAddress: string,
  privateKey: string,
) {
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  const client = publicClient(rpcUrl, chainId);
  const current = (await client.readContract({
    address: identityAddress as `0x${string}`,
    abi: identityAbi as any,
    functionName: "getUserId",
    args: [account.address],
  })) as bigint;
  if (current && current > 0n) return current;

  const wallet = walletClient(rpcUrl, chainId, privateKey);
  const txHash = await wallet.writeContract({
    address: identityAddress as `0x${string}`,
    abi: identityAbi as any,
    functionName: "register",
    args: [],
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  const next = (await client.readContract({
    address: identityAddress as `0x${string}`,
    abi: identityAbi as any,
    functionName: "getUserId",
    args: [account.address],
  })) as bigint;
  return next;
}

export async function readOrgCreateFee(rpcUrl: string, chainId: number, orgRegistry: string) {
  const client = publicClient(rpcUrl, chainId);
  const fee = (await client.readContract({
    address: orgRegistry as `0x${string}`,
    abi: achievoOrgRegistryAbi as any,
    functionName: "createOrgFee",
    args: [],
  })) as bigint;
  return fee;
}

export async function createOrgOnchain(params: {
  rpcUrl: string;
  chainId: number;
  orgRegistry: string;
  handle: string;
  privateKey: string;
  feeWei: bigint;
}) {
  const client = publicClient(params.rpcUrl, params.chainId);
  const wallet = walletClient(params.rpcUrl, params.chainId, params.privateKey);
  const txHash = await wallet.writeContract({
    address: params.orgRegistry as `0x${string}`,
    abi: achievoOrgRegistryAbi as any,
    functionName: "createOrg",
    args: [params.handle],
    value: params.feeWei,
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function claimUsernameOnchain(params: {
  rpcUrl: string;
  chainId: number;
  registry: string;
  username: string;
  privateKey: string;
}) {
  const client = publicClient(params.rpcUrl, params.chainId);
  const wallet = walletClient(params.rpcUrl, params.chainId, params.privateKey);
  const txHash = await wallet.writeContract({
    address: params.registry as `0x${string}`,
    abi: achievoUsernameRegistryV1Abi as any,
    functionName: "claimUsername",
    args: [params.username],
  });
  await client.waitForTransactionReceipt({ hash: txHash });
  return txHash;
}

export async function getUsernameOwner(params: {
  rpcUrl: string;
  chainId: number;
  registry: string;
  handleHash: string;
}) {
  const client = publicClient(params.rpcUrl, params.chainId);
  const owner = (await client.readContract({
    address: params.registry as `0x${string}`,
    abi: achievoUsernameRegistryV1Abi as any,
    functionName: "usernameOwner",
    args: [params.handleHash as `0x${string}`],
  })) as string;
  return owner?.toLowerCase() || null;
}

export function toWei(amountEth: string) {
  return parseEther(amountEth);
}
