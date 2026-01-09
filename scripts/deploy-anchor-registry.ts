import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { network } from "hardhat";

async function main() {
  const operator = process.env.ANCHOR_OPERATOR_ADDRESS;
  if (!operator) {
    throw new Error("ANCHOR_OPERATOR_ADDRESS is required");
  }

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  const Registry = await ethers.getContractFactory("AchievoAnchorRegistry");
  const registry = await Registry.deploy(operator);
  await registry.waitForDeployment();
  const address = await registry.getAddress();
  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);

  const deployment = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    operator,
    address,
    timestamp: new Date().toISOString(),
  };

  const legacyOutPath = join(process.cwd(), "deployments", "anchor-registry.base-sepolia.json");
  const outDir = join(process.cwd(), "deployments", "base-sepolia");
  const outPath = join(outDir, "anchorRegistry.json");
  mkdirSync(join(process.cwd(), "deployments"), { recursive: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(legacyOutPath, JSON.stringify(deployment, null, 2));
  writeFileSync(outPath, JSON.stringify(deployment, null, 2));

  console.log("Deployed by :", deployer.address);
  console.log("Operator    :", operator);
  console.log("AchievoAnchorRegistry:", address);
  console.log(`Deployment saved -> ${legacyOutPath}`);
  console.log(`Deployment saved -> ${outPath}`);
  console.log("Set envs:");
  console.log("  ANCHOR_REGISTRY_ADDRESS=", address);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
