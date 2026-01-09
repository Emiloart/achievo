/** Runtime indexer configuration derived from environment variables. */
export type IndexerConfig = {
  enabled: boolean;
  chainId: number;
  rpcUrl: string;
  finalityDepth: number;
  startBlock: number;
  batchSize: number;
};

function toBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value === undefined || value === null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function toNumberEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

/** Loads indexer configuration with explicit defaults. */
export function loadIndexerConfig(): IndexerConfig {
  return {
    enabled: toBooleanEnv(process.env.INDEXER_ENABLED, false),
    chainId: toNumberEnv(process.env.INDEXER_CHAIN_ID, 84532),
    rpcUrl:
      process.env.INDEXER_RPC_URL ||
      process.env.BASE_SEPOLIA_RPC_URL ||
      process.env.BASE_SEPOLIA_RPC ||
      process.env.RPC_URL ||
      "https://sepolia.base.org",
    finalityDepth: Math.max(1, Math.floor(toNumberEnv(process.env.INDEXER_FINALITY_DEPTH, 20))),
    startBlock: Math.max(0, Math.floor(toNumberEnv(process.env.INDEXER_START_BLOCK, 0))),
    batchSize: Math.max(1, Math.floor(toNumberEnv(process.env.INDEXER_BATCH_SIZE, 2000))),
  };
}
