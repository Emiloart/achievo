import { defineConfig } from "hardhat/config";
import hardhatToolboxMochaEthers from "@nomicfoundation/hardhat-toolbox-mocha-ethers";

const baseSepoliaUrl = process.env.BASE_SEPOLIA_RPC_URL;
const baseSepoliaKey = process.env.BASE_SEPOLIA_PRIVATE_KEY;
const needsBaseSepolia = process.env.HARDHAT_NETWORK === "baseSepolia";

if (needsBaseSepolia && (!baseSepoliaUrl || !baseSepoliaKey)) {
  throw new Error("BASE_SEPOLIA_RPC_URL and BASE_SEPOLIA_PRIVATE_KEY are required for baseSepolia network");
}

const localhostUrl = process.env.LOCALHOST_RPC_URL || process.env.E2E_CHAIN_RPC_URL || "http://127.0.0.1:8545";

const networks: Record<string, any> = {
  hardhat: { type: "edr-simulated", chainId: 31337 },
  localhost: { type: "http", url: localhostUrl },
};

if (baseSepoliaUrl && baseSepoliaKey) {
  networks.baseSepolia = {
    type: "http",
    chainId: 84532,
    url: baseSepoliaUrl,
    accounts: [baseSepoliaKey],
  };
}

export default defineConfig({
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks,
  etherscan: {
    apiKey: {
      // Use BaseScan key if available; falls back to Etherscan key env
      baseSepolia: process.env.BASESCAN_API_KEY || process.env.ETHERSCAN_API_KEY || "",
    },
  },
  plugins: [hardhatToolboxMochaEthers],
  test: {
    mocha: {
      timeout: 20_000,
    },
  },
});
