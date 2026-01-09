import { getRpcClient, RpcClient } from "../chain/reliability/rpc.client";

type ChainClientConfig = {
  chainId: number;
  rpcUrl: string;
};

export class ChainClient {
  private readonly client: RpcClient;
  private readonly blockTimestampCache = new Map<number, number>();

  constructor(config: ChainClientConfig) {
    this.client = getRpcClient({
      chainId: config.chainId,
      rpcUrl: config.rpcUrl,
      name: "IndexerChain",
    });
  }

  async getBlockNumber(): Promise<number> {
    return this.client.getBlockNumber();
  }

  async getBlock(blockNumber: number) {
    return this.client.getBlock(blockNumber);
  }

  async getBlockTimestamp(blockNumber: number): Promise<number> {
    const cached = this.blockTimestampCache.get(blockNumber);
    if (cached !== undefined) return cached;
    const block = await this.getBlock(blockNumber);
    const ts = Number(block.timestamp);
    this.blockTimestampCache.set(blockNumber, ts);
    return ts;
  }

  async getLogs(params: { fromBlock: number; toBlock: number; addresses: `0x${string}`[] }) {
    return this.client.getLogs({
      fromBlock: params.fromBlock,
      toBlock: params.toBlock,
      addresses: params.addresses,
    });
  }

  async getTransactionReceipt(hash: `0x${string}`) {
    return this.client.getTransactionReceipt(hash);
  }
}
