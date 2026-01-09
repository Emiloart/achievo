/**
 * On-chain org registry adapter.
 *
 * Verifies org creation transactions and exposes registry requirements for UI preparation.
 */
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { decodeEventLog, decodeFunctionData } from "viem";
import { achievoOrgRegistryAbi } from "../../../packages/achievo-abi";
import { readDeploymentFile } from "../common/deployments";
import { getRpcClient } from "../chain/reliability/rpc.client";
import { RpcUnavailableError } from "../chain/reliability/rpc.errors";
import { handleRules, hashHandle, normalizeHandle } from "./handle.util";

const ZERO = "0x0000000000000000000000000000000000000000";

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function normalizeAddress(raw?: string | null): `0x${string}` | null {
  if (!raw) return null;
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  return value.toLowerCase() as `0x${string}`;
}

function normalizeHash(raw?: string | null): `0x${string}` | null {
  if (!raw) return null;
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  return value.toLowerCase() as `0x${string}`;
}

@Injectable()
/** Reads and verifies org creation transactions against the on-chain registry. */
export class OrgRegistryService {
  private readonly chainId = Number(process.env.ORG_CREATE_CHAIN_ID || 84532);
  private readonly rpcUrl =
    process.env.ORG_CREATE_RPC_URL ||
    process.env.BASE_SEPOLIA_RPC_URL ||
    process.env.BASE_SEPOLIA_RPC ||
    process.env.RPC_URL ||
    "https://sepolia.base.org";

  private readonly client = getRpcClient({
    chainId: this.chainId,
    rpcUrl: this.rpcUrl,
    name: "OrgRegistryChain",
  });

  isRequired() {
    return toBooleanEnv("ORG_CREATE_REQUIRED", true);
  }

  getChainId() {
    return this.chainId;
  }

  getRpcUrl() {
    return this.rpcUrl;
  }

  getRegistryAddressSafe(): `0x${string}` | null {
    const env = normalizeAddress(process.env.ORG_REGISTRY_ADDRESS);
    if (env) return env;
    const deployment = readDeploymentFile("orgRegistry.json");
    return normalizeAddress(deployment?.address) || null;
  }

  getRegistryAddress(): `0x${string}` {
    const address = this.getRegistryAddressSafe();
    if (!address) throw new ServiceUnavailableException("ORG_REGISTRY_NOT_CONFIGURED");
    return address;
  }

  async getCreateOrgFee() {
    const address = this.getRegistryAddress();
    try {
      const fee = (await this.client.readContract({
        address,
        abi: achievoOrgRegistryAbi as any,
        functionName: "createOrgFee",
        args: [],
      })) as bigint;
      return fee;
    } catch (error) {
      throw new RpcUnavailableError("ORG_REGISTRY_UNAVAILABLE");
    }
  }

  async getTreasury() {
    const address = this.getRegistryAddress();
    try {
      const treasury = (await this.client.readContract({
        address,
        abi: achievoOrgRegistryAbi as any,
        functionName: "treasury",
        args: [],
      })) as `0x${string}`;
      return treasury;
    } catch (error) {
      throw new RpcUnavailableError("ORG_REGISTRY_UNAVAILABLE");
    }
  }

  getRequirements() {
    return {
      required: this.isRequired(),
      chainId: this.chainId,
      registry: this.getRegistryAddressSafe(),
      rules: handleRules(),
    };
  }

  async verifyCreateOrgTx(params: { txHash: string; handle: string; creator: string }) {
    const normalized = normalizeHandle(params.handle);
    if (!normalized.valid) throw new BadRequestException("INVALID_HANDLE");
    const creator = normalizeAddress(params.creator) || ZERO;
    const registry = this.getRegistryAddress();
    const txHash = normalizeAddress(params.txHash) as `0x${string}`;
    if (!txHash) throw new BadRequestException("INVALID_TX_HASH");

    let tx: any;
    try {
      tx = await this.client.getTransaction(txHash);
    } catch (error) {
      throw new RpcUnavailableError("ORG_TX_UNAVAILABLE");
    }
    if (!tx?.to || normalizeAddress(tx.to) !== registry) {
      throw new BadRequestException("ORG_TX_NOT_REGISTRY");
    }

    try {
      const decodedInput = decodeFunctionData({
        abi: achievoOrgRegistryAbi as any,
        data: tx.input,
      }) as { functionName: string; args?: any[] };
      if (decodedInput.functionName !== "createOrg") {
        throw new BadRequestException("ORG_TX_NOT_CREATE_ORG");
      }
      const inputHandle = String(decodedInput.args?.[0] || "").toLowerCase();
      if (inputHandle !== normalized.handle) throw new BadRequestException("ORG_HANDLE_MISMATCH");
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException("ORG_TX_INVALID");
    }

    let receipt: any;
    try {
      receipt = await this.client.getTransactionReceipt(txHash);
    } catch (error) {
      throw new RpcUnavailableError("ORG_TX_RECEIPT_UNAVAILABLE");
    }
    if (!receipt || receipt.status !== "success") throw new BadRequestException("ORG_TX_FAILED");
    if (!receipt.to || normalizeAddress(receipt.to) !== registry) {
      throw new BadRequestException("ORG_TX_NOT_REGISTRY");
    }
    if (receipt.from && normalizeAddress(receipt.from) !== creator) {
      throw new BadRequestException("ORG_CREATOR_MISMATCH");
    }

    let decoded:
      | { handle?: string; handleHash?: string; creator?: string; createdAt?: bigint; feePaid?: bigint; logIndex?: number }
      | null = null;
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== registry.toLowerCase()) continue;
      try {
        const event = decodeEventLog({
          abi: achievoOrgRegistryAbi as any,
          data: log.data,
          topics: log.topics,
        }) as { eventName: string; args: Record<string, any> };
        if (event.eventName !== "OrgCreated") continue;
        decoded = {
          handle: event.args.handle,
          handleHash: event.args.handleHash,
          creator: event.args.creator,
          createdAt: event.args.createdAt,
          feePaid: event.args.feePaid,
          logIndex: typeof log.logIndex === "number" ? log.logIndex : Number(log.logIndex ?? 0),
        };
        break;
      } catch {
        continue;
      }
    }

    if (!decoded?.handle) throw new BadRequestException("ORG_EVENT_NOT_FOUND");
    if (String(decoded.handle).toLowerCase() !== normalized.handle) throw new BadRequestException("ORG_HANDLE_MISMATCH");
    if (!decoded.creator || normalizeAddress(decoded.creator) !== creator) throw new BadRequestException("ORG_CREATOR_MISMATCH");

    let feeAtBlock: bigint;
    try {
      feeAtBlock = (await this.client.readContract({
        address: registry,
        abi: achievoOrgRegistryAbi as any,
        functionName: "createOrgFee",
        args: [],
        blockNumber: receipt.blockNumber,
      })) as bigint;
    } catch (error) {
      throw new RpcUnavailableError("ORG_FEE_UNAVAILABLE");
    }

    const paid = decoded.feePaid ?? 0n;
    if (paid < feeAtBlock) throw new BadRequestException("ORG_FEE_TOO_LOW");
    if (typeof tx.value === "bigint" && tx.value < feeAtBlock) throw new BadRequestException("ORG_FEE_TOO_LOW");

    const expectedHandleHash = hashHandle(normalized.handle).toLowerCase();
    if (decoded.handleHash && normalizeHash(decoded.handleHash) !== (expectedHandleHash as `0x${string}`)) {
      throw new BadRequestException("ORG_HANDLE_HASH_MISMATCH");
    }
    const handleHash = decoded.handleHash || expectedHandleHash;

    return {
      txHash,
      handle: normalized.handle,
      handleHash: String(handleHash).toLowerCase(),
      creator,
      createdAt: decoded.createdAt ? Number(decoded.createdAt) : null,
      feePaid: paid.toString(),
      registry,
      chainId: this.chainId,
      blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : null,
      blockHash: receipt.blockHash ? String(receipt.blockHash).toLowerCase() : null,
      logIndex: decoded.logIndex ?? null,
      fromAddress: receipt.from ? normalizeAddress(receipt.from) : creator,
      toAddress: receipt.to ? normalizeAddress(receipt.to) : registry,
    };
  }
}
