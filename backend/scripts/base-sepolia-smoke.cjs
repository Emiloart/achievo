const { createPublicClient, http } = require("viem");
const { baseSepolia } = require("viem/chains");

const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL;
if (!rpcUrl) {
  console.log("BASE_SEPOLIA_RPC_URL not set; skipping.");
  process.exit(0);
}

async function main() {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });
  const block = await client.getBlockNumber();
  console.log(`Base Sepolia head block: ${block}`);
}

main().catch((err) => {
  console.error("Base Sepolia smoke failed", err);
  process.exit(1);
});
