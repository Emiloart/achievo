/**
 * Anchoring service for on-chain hash commitments.
 *
 * Provides registry access and safe, network-aware verification helpers.
 */
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { createWalletClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { BASE_SEPOLIA_RPC } from "../../../packages/achievo-config";
import { achievoAnchorRegistryAbi } from "../../../packages/achievo-abi";
import { readAnchorRegistryDeployment } from "../common/deployments";
import { getRpcClient } from "../chain/reliability/rpc.client";
import { isRpcUnavailableError } from "../chain/reliability/rpc.errors";

type AnchorWriteResult = {
  txHash: `0x${string}`;
  anchoredAt: Date;
  chainId: number;
  contract: `0x${string}`;
  blockNumber?: number | null;
  blockHash?: string | null;
  fromAddress?: string | null;
  toAddress?: string | null;
  receiptStatus?: string | null;
};

type AnchorVerifyResult = {
  anchorPresent: boolean;
  anchorVerified: boolean | "unknown";
  kind?: number | null;
  timestamp?: number | null;
  submitter?: string | null;
  chainId?: number;
  contract?: string;
};

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function normalizeAddress(raw?: string | null): `0x${string}` | null {
  if (!raw) return null;
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  return value as `0x${string}`;
}

function normalizeHash(raw: string): `0x${string}` {
  const trimmed = String(raw || "").trim();
  const hex = trimmed.startsWith("0x") ? trimmed.slice(2) : trimmed;
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new InternalServerErrorException("INVALID_ANCHOR_HASH");
  }
  return `0x${hex.toLowerCase()}` as `0x${string}`;
}

@Injectable()
/** Provides anchoring registry access and validation helpers. */
export class AnchoringService {
  private readonly rpcUrl = process.env.ANCHOR_RPC_URL || process.env.RPC_URL || BASE_SEPOLIA_RPC;
  private readonly publicClient = getRpcClient({
    chainId: this.getChainId(),
    rpcUrl: this.rpcUrl,
    name: "AnchorRegistry",
  });

  isEnabled() {
    return toBooleanEnv("ANCHORING_ENABLED", false);
  }

  isQueueEnabled() {
    return toBooleanEnv("ANCHOR_QUEUE_ENABLED", true);
  }

  getBatchSize() {
    const raw = Number(process.env.ANCHOR_BATCH_SIZE || 25);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 25;
  }

  getChainId() {
    const raw = Number(process.env.ANCHOR_CHAIN_ID || baseSepolia.id);
    return Number.isFinite(raw) ? raw : baseSepolia.id;
  }

  getRpcUrl() {
    return this.rpcUrl;
  }

  normalizeHash(value: string) {
    return normalizeHash(value);
  }

  getRegistryAddressSafe(): `0x${string}` | null {
    return this.resolveRegistryAddress();
  }

  private resolveRegistryAddress(): `0x${string}` | null {
    const env = normalizeAddress(process.env.ANCHOR_REGISTRY_ADDRESS);
    if (env) return env;
    const fallback = readAnchorRegistryDeployment();
    if (fallback?.address) return normalizeAddress(fallback.address);
    return null;
  }

  private getRegistryAddress(): `0x${string}` {
    const address = this.resolveRegistryAddress();
    if (!address) {
      throw new InternalServerErrorException("ANCHOR_REGISTRY_ADDRESS not configured");
    }
    return address;
  }

  private getOperatorAccount() {
    const raw = process.env.ANCHOR_OPERATOR_PRIVATE_KEY || "";
    if (!raw) throw new InternalServerErrorException("ANCHOR_OPERATOR_PRIVATE_KEY not configured");
    const key = raw.startsWith("0x") ? raw : `0x${raw}`;
    return privateKeyToAccount(key as `0x${string}`);
  }

  private getWalletClient() {
    const account = this.getOperatorAccount();
    const chainId = this.getChainId();
    return createWalletClient({
      account,
      chain: {
        id: chainId,
        name: `chain-${chainId}`,
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [this.rpcUrl] } },
      },
      transport: http(this.rpcUrl),
    });
  }

  async anchorHash(params: { hashHex32: string; kind: number }): Promise<AnchorWriteResult> {
    const hash = normalizeHash(params.hashHex32);
    const contract = this.getRegistryAddress();
    const walletClient = this.getWalletClient();
    const txHash = await walletClient.writeContract({
      address: contract,
      abi: achievoAnchorRegistryAbi as any,
      functionName: "anchor",
      args: [hash, params.kind],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt(txHash);
    const block = receipt.blockNumber ? await this.publicClient.getBlock(Number(receipt.blockNumber)) : null;
    const anchoredAt = block ? new Date(Number(block.timestamp) * 1000) : new Date();
    return {
      txHash,
      anchoredAt,
      chainId: this.getChainId(),
      contract,
      blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : null,
      blockHash: receipt.blockHash ? String(receipt.blockHash).toLowerCase() : null,
      fromAddress: receipt.from ? String(receipt.from).toLowerCase() : null,
      toAddress: receipt.to ? String(receipt.to).toLowerCase() : null,
      receiptStatus: receipt.status,
    };
  }

  async anchorBatch(params: { hashHex32List: string[]; kind: number }): Promise<AnchorWriteResult> {
    const hashes = params.hashHex32List.map((hash) => normalizeHash(hash));
    if (!hashes.length) {
      throw new InternalServerErrorException("ANCHOR_BATCH_EMPTY");
    }
    const contract = this.getRegistryAddress();
    const walletClient = this.getWalletClient();
    const txHash = await walletClient.writeContract({
      address: contract,
      abi: achievoAnchorRegistryAbi as any,
      functionName: "anchorBatch",
      args: [hashes, params.kind],
    });
    const receipt = await this.publicClient.waitForTransactionReceipt(txHash);
    const block = receipt.blockNumber ? await this.publicClient.getBlock(Number(receipt.blockNumber)) : null;
    const anchoredAt = block ? new Date(Number(block.timestamp) * 1000) : new Date();
    return {
      txHash,
      anchoredAt,
      chainId: this.getChainId(),
      contract,
      blockNumber: receipt.blockNumber ? Number(receipt.blockNumber) : null,
      blockHash: receipt.blockHash ? String(receipt.blockHash).toLowerCase() : null,
      fromAddress: receipt.from ? String(receipt.from).toLowerCase() : null,
      toAddress: receipt.to ? String(receipt.to).toLowerCase() : null,
      receiptStatus: receipt.status,
    };
  }

  async verifyAnchored(params: { hashHex32: string; contract?: string | null }): Promise<AnchorVerifyResult> {
    const hash = normalizeHash(params.hashHex32);
    const contract = params.contract ? normalizeAddress(params.contract) : this.getRegistryAddressSafe();
    if (!contract) return { anchorPresent: false, anchorVerified: false };
    try {
      const record = (await this.publicClient.readContract({
        address: contract,
        abi: achievoAnchorRegistryAbi as any,
        functionName: "records",
        args: [hash],
      })) as readonly [string, bigint, number];
      const [submitter, timestamp, kind] = record;
      const ts = Number(timestamp);
      const present = Number.isFinite(ts) && ts > 0;
      return {
        anchorPresent: present,
        anchorVerified: present,
        submitter,
        timestamp: present ? ts : null,
        kind,
        chainId: this.getChainId(),
        contract,
      };
    } catch (error) {
      if (isRpcUnavailableError(error)) {
        return {
          anchorPresent: false,
          anchorVerified: "unknown",
          chainId: this.getChainId(),
          contract,
        };
      }
      try {
        const present = (await this.publicClient.readContract({
          address: contract,
          abi: achievoAnchorRegistryAbi as any,
          functionName: "isAnchored",
          args: [hash],
        })) as boolean;
        return {
          anchorPresent: Boolean(present),
          anchorVerified: Boolean(present),
          chainId: this.getChainId(),
          contract,
        };
      } catch (fallbackError) {
        return {
          anchorPresent: false,
          anchorVerified: "unknown",
          chainId: this.getChainId(),
          contract,
        };
      }
    }
  }
}
