/**
 * Username registry chain adapter.
 *
 * Reads ownership state and submits transfers while preserving on-chain source-of-truth.
 */
import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { createWalletClient, http, decodeEventLog } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { PrismaService } from "../prisma/prisma.service";
import { getRpcClient } from "../chain/reliability/rpc.client";
import { RpcUnavailableError } from "../chain/reliability/rpc.errors";
import { achievoUsernameRegistryV1Abi } from "../../../packages/achievo-abi";
import { normalizeUsername, validateUsername } from "../../../packages/username";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function normalizeAddress(raw?: string | null) {
  if (!raw) return null;
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  return value.toLowerCase();
}

function normalizeHash(raw?: string | null) {
  if (!raw) return null;
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  return value.toLowerCase();
}

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function toNumberEnv(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) ? raw : fallback;
}

@Injectable()
/** Reads and writes username registry state on-chain. */
export class UsernamesChainService {
  private readonly chainId = toNumberEnv("USERNAME_REGISTRY_CHAIN_ID", toNumberEnv("CHAIN_ID", 84532));
  private readonly rpcUrl =
    process.env.USERNAME_REGISTRY_RPC_URL ||
    process.env.RPC_URL ||
    process.env.BASE_SEPOLIA_RPC_URL ||
    process.env.BASE_SEPOLIA_RPC ||
    "https://sepolia.base.org";

  private readonly client = getRpcClient({
    chainId: this.chainId,
    rpcUrl: this.rpcUrl,
    name: "UsernameRegistryChain",
  });

  constructor(private readonly prisma: PrismaService) {}

  getChainId() {
    return this.chainId;
  }

  getRegistryAddressSafe(): `0x${string}` | null {
    const env =
      normalizeAddress(process.env.USERNAME_REGISTRY_ADDRESS) ||
      normalizeAddress(process.env.ACHIEVO_USERNAME_REGISTRY_ADDRESS) ||
      normalizeAddress(process.env.NEXT_PUBLIC_ACHIEVO_USERNAME_REGISTRY_ADDRESS);
    return (env as `0x${string}`) || null;
  }

  getRegistryAddress(): `0x${string}` {
    const address = this.getRegistryAddressSafe();
    if (!address) throw new ServiceUnavailableException("USERNAME_REGISTRY_NOT_CONFIGURED");
    return address;
  }

  private getOperatorAccount() {
    const raw =
      process.env.ACHIEVO_USERNAME_OPERATOR_PRIVATE_KEY ||
      process.env.USERNAME_OPERATOR_PRIVATE_KEY ||
      process.env.USERNAME_REGISTRY_OPERATOR_PRIVATE_KEY ||
      "";
    if (!raw) {
      throw new ServiceUnavailableException("USERNAME_OPERATOR_PRIVATE_KEY not configured");
    }
    const key = raw.startsWith("0x") ? raw : `0x${raw}`;
    return privateKeyToAccount(key as `0x${string}`);
  }

  private getWalletClient() {
    const account = this.getOperatorAccount();
    return createWalletClient({
      account,
      transport: http(this.rpcUrl),
      chain: {
        id: this.chainId,
        name: `chain-${this.chainId}`,
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [this.rpcUrl] } },
      },
    });
  }

  getSettlementMode() {
    const raw = String(process.env.USERNAME_SETTLEMENT_MODE || "OPERATOR").toUpperCase();
    return raw === "SELLER_TX" ? "SELLER_TX" : "OPERATOR";
  }

  async getOwnerByHandleHash(handleHash: string) {
    const address = this.getRegistryAddress();
    try {
      const owner = (await this.client.readContract({
        address,
        abi: achievoUsernameRegistryV1Abi as any,
        functionName: "usernameOwner",
        args: [handleHash as `0x${string}`],
      })) as `0x${string}`;
      if (!owner || owner.toLowerCase() === ZERO_ADDRESS) return null;
      return owner.toLowerCase();
    } catch (error) {
      throw new RpcUnavailableError("USERNAME_REGISTRY_UNAVAILABLE");
    }
  }

  private async useProjection() {
    if (!toBooleanEnv("INDEXER_ENABLED", false)) return false;
    const cursor = await this.prisma.chainCursor.findUnique({ where: { chainId: this.chainId } });
    if (!cursor) return false;
    const head = await this.client.getBlockNumber();
    const lagThreshold = toNumberEnv("USERNAME_READ_MAX_LAG_BLOCKS", toNumberEnv("INDEXER_FINALITY_DEPTH", 20));
    const lag = head - cursor.latestProcessedBlock;
    return lag >= 0 && lag <= lagThreshold;
  }

  private async getOwnerFromProjection(handleHash: string) {
    const row = await this.prisma.usernameOwnership.findUnique({
      where: { chainId_handleHash: { chainId: this.chainId, handleHash: handleHash.toLowerCase() } },
    });
    if (!row || row.removed) return null;
    return row.ownerAddress;
  }

  async resolveOwner(normalized: string) {
    const { handleHash } = normalizeUsername(normalized);
    if (await this.useProjection()) {
      const owner = await this.getOwnerFromProjection(handleHash);
      if (owner) return { owner, source: "projection" as const, handleHash };
    }
    const owner = await this.getOwnerByHandleHash(handleHash);
    return { owner, source: "chain" as const, handleHash };
  }

  async isAvailable(name: string) {
    const normalized = normalizeUsername(name).normalized;
    const validation = validateUsername(normalized);
    if (!validation.valid) {
      return { available: false, reason: "INVALID", normalized, handleHash: normalizeUsername(normalized).handleHash };
    }
    const { owner, source, handleHash } = await this.resolveOwner(normalized);
    return {
      available: !owner,
      reason: owner ? "TAKEN" : "AVAILABLE",
      normalized,
      handleHash,
      source,
      owner,
    };
  }

  async transferUsername(params: { from: string; to: string; normalized: string }) {
    const normalized = normalizeUsername(params.normalized).normalized;
    const validation = validateUsername(normalized);
    if (!validation.valid) throw new BadRequestException("INVALID_USERNAME");
    const walletClient = this.getWalletClient();
    const address = this.getRegistryAddress();
    const hash = await walletClient.writeContract({
      address,
      abi: achievoUsernameRegistryV1Abi as any,
      functionName: "transferUsername",
      args: [params.from as `0x${string}`, params.to as `0x${string}`, normalized],
    });
    return hash as `0x${string}`;
  }

  async verifyTransferReceipt(params: { txHash: string; normalized: string }) {
    const normalized = normalizeUsername(params.normalized).normalized;
    const validation = validateUsername(normalized);
    if (!validation.valid) throw new BadRequestException("INVALID_USERNAME");
    const txHash = normalizeHash(params.txHash);
    if (!txHash) throw new BadRequestException("INVALID_TX_HASH");

    let receipt: any;
    try {
      receipt = await this.client.getTransactionReceipt(txHash as `0x${string}`);
    } catch (error) {
      throw new RpcUnavailableError("USERNAME_TX_RECEIPT_UNAVAILABLE");
    }
    if (!receipt || receipt.status !== "success") throw new BadRequestException("USERNAME_TX_FAILED");

    const registry = this.getRegistryAddress();
    let decoded: { username?: string; from?: string; to?: string; logIndex?: number } | null = null;
    for (const log of receipt.logs || []) {
      if (log.address?.toLowerCase() !== registry.toLowerCase()) continue;
      try {
        const event = decodeEventLog({
          abi: achievoUsernameRegistryV1Abi as any,
          data: log.data,
          topics: log.topics,
        }) as { eventName: string; args: Record<string, any> };
        if (event.eventName !== "UsernameTransferred") continue;
        decoded = {
          username: String(event.args.username || ""),
          from: event.args.from,
          to: event.args.to,
          logIndex: typeof log.logIndex === "number" ? log.logIndex : Number(log.logIndex ?? 0),
        };
        break;
      } catch {
        continue;
      }
    }
    if (!decoded?.username) throw new BadRequestException("USERNAME_EVENT_NOT_FOUND");
    if (normalizeUsername(decoded.username).normalized !== normalized) {
      throw new BadRequestException("USERNAME_MISMATCH");
    }

    return {
      txHash,
      blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : null,
      blockHash: normalizeHash(receipt.blockHash),
      logIndex: decoded.logIndex ?? null,
      from: normalizeAddress(decoded.from),
      to: normalizeAddress(decoded.to),
    };
  }
}
