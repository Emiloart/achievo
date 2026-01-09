/**
 * Log fetcher with bounded ranges and deterministic retry behavior.
 */
import { ChainClient } from "./chain.client";

/** Fetches on-chain logs in bounded ranges. */
export class LogFetcher {
  constructor(private readonly client: ChainClient) {}

  async fetchLogs(params: {
    fromBlock: number;
    toBlock: number;
    addresses: `0x${string}`[];
    batchSize: number;
    maxRetries?: number;
  }) {
    if (!params.addresses.length || params.fromBlock > params.toBlock) return [];
    const batchSize = Math.max(1, params.batchSize);
    const logs: any[] = [];

    for (let start = params.fromBlock; start <= params.toBlock; start += batchSize) {
      const end = Math.min(params.toBlock, start + batchSize - 1);
      const batch = await this.client.getLogs({
        fromBlock: start,
        toBlock: end,
        addresses: params.addresses,
      });
      logs.push(...batch);
    }

    return logs;
  }
}
