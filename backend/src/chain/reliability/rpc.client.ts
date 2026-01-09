/**
 * RPC client wrapper with retry and circuit breaker semantics.
 *
 * Ensures callers receive explicit unavailability errors instead of false negatives.
 */
import { createPublicClient, http } from "viem";
import type { PublicClient } from "viem";
import { CircuitBreaker } from "./circuit.breaker";
import { RetryPolicy } from "./retry.policy";
import { RpcUnavailableError } from "./rpc.errors";

type RpcClientConfig = {
  chainId: number;
  rpcUrl: string;
  name?: string;
};

function toNumberEnv(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

type RpcClientSnapshot = {
  chainId: number;
  rpcUrl: string;
  name: string;
  breaker: ReturnType<CircuitBreaker["snapshot"]>;
};

const registry = new Map<string, RpcClient>();

/** Returns a shared RPC client instance for the given chain configuration. */
export function getRpcClient(config: RpcClientConfig) {
  const key = `${config.chainId}:${config.rpcUrl}`;
  const existing = registry.get(key);
  if (existing) return existing;
  const client = new RpcClient(config);
  registry.set(key, client);
  return client;
}

/** Returns diagnostic snapshots for each configured RPC client. */
export function getRpcClientSnapshots() {
  return Array.from(registry.values()).map((client) => client.snapshot());
}

/** RPC client wrapper that applies retry and circuit breaker policies. */
export class RpcClient {
  private readonly client: PublicClient;
  private readonly breaker: CircuitBreaker;
  private readonly retry: RetryPolicy;
  private readonly chainId: number;
  private readonly rpcUrl: string;
  private readonly name: string;

  constructor(config: RpcClientConfig) {
    this.chainId = config.chainId;
    this.rpcUrl = config.rpcUrl;
    this.name = config.name || `chain-${config.chainId}`;
    this.client = createPublicClient({
      transport: http(config.rpcUrl),
      chain: {
        id: config.chainId,
        name: this.name,
        nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
        rpcUrls: { default: { http: [config.rpcUrl] } },
      },
    });
    this.breaker = new CircuitBreaker({
      failureThreshold: toNumberEnv("RPC_CB_FAILURE_THRESHOLD", 5),
      cooldownMs: toNumberEnv("RPC_CB_COOLDOWN_MS", 15000),
    });
    this.retry = new RetryPolicy({
      maxRetries: toNumberEnv("RPC_MAX_RETRIES", 3),
      baseDelayMs: toNumberEnv("RPC_BACKOFF_BASE_MS", 200),
      maxDelayMs: toNumberEnv("RPC_BACKOFF_MAX_MS", 5000),
    });
  }

  snapshot(): RpcClientSnapshot {
    return {
      chainId: this.chainId,
      rpcUrl: this.rpcUrl,
      name: this.name,
      breaker: this.breaker.snapshot(),
    };
  }

  private async call<T>(fn: () => Promise<T>): Promise<T> {
    if (String(process.env.E2E_RPC_FAIL_MODE || "").toLowerCase() === "true") {
      throw new RpcUnavailableError("E2E_RPC_FAIL_MODE");
    }
    this.breaker.assertReady();
    try {
      const result = await this.retry.execute(fn);
      this.breaker.recordSuccess();
      return result;
    } catch (error) {
      this.breaker.recordFailure();
      if (error instanceof RpcUnavailableError) throw error;
      const message = (error as any)?.message || "";
      if (message.toLowerCase().includes("circuit")) {
        throw new RpcUnavailableError("RPC_CIRCUIT_OPEN");
      }
      throw error;
    }
  }

  async getBlockNumber(): Promise<number> {
    const value = await this.call(() => this.client.getBlockNumber());
    return Number(value);
  }

  async getChainId(): Promise<number> {
    const value = await this.call(() => this.client.getChainId());
    return Number(value);
  }

  async getBlock(blockNumber: number) {
    return this.call(() => this.client.getBlock({ blockNumber: BigInt(blockNumber) }));
  }

  async getLogs(params: { fromBlock: number; toBlock: number; addresses: `0x${string}`[] }) {
    return this.call(() =>
      this.client.getLogs({
        address: params.addresses,
        fromBlock: BigInt(params.fromBlock),
        toBlock: BigInt(params.toBlock),
      }),
    );
  }

  async readContract(params: {
    address: `0x${string}`;
    abi: any;
    functionName: string;
    args?: readonly any[];
    blockNumber?: bigint | number;
  }) {
    return this.call(() => this.client.readContract(params as any));
  }

  async getTransaction(hash: `0x${string}`) {
    return this.call(() => this.client.getTransaction({ hash }));
  }

  async getTransactionReceipt(hash: `0x${string}`) {
    return this.call(() => this.client.getTransactionReceipt({ hash }));
  }

  async waitForTransactionReceipt(hash: `0x${string}`) {
    return this.call(() => this.client.waitForTransactionReceipt({ hash }));
  }

  async getBytecode(address: `0x${string}`) {
    return this.call(() => this.client.getBytecode({ address }));
  }
}
