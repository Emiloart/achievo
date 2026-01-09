import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { network } from "hardhat";

async function main() {
  const timelock = process.env.TIMELOCK_ADDRESS || "";
  if (!timelock) {
    throw new Error("TIMELOCK_ADDRESS is required");
  }
  const treasury = process.env.ORG_TREASURY || "";
  if (!treasury) {
    throw new Error("ORG_TREASURY is required");
  }

  const feeRaw = process.env.ORG_CREATE_FEE || "0";
  const fee = BigInt(feeRaw);

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  const Registry = await ethers.getContractFactory("AchievoOrgRegistry");
  const registry = await Registry.deploy(fee, treasury, timelock);
  await registry.waitForDeployment();
  const address = await registry.getAddress();

  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);

  const deployment = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    timelock,
    treasury,
    createOrgFee: fee.toString(),
    address,
    timestamp: new Date().toISOString(),
  };

  const outDir = join(process.cwd(), "deployments", "base-sepolia");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "orgRegistry.json");
  writeFileSync(outPath, JSON.stringify(deployment, null, 2));

  console.log("Deployed by :", deployer.address);
  console.log("Timelock    :", timelock);
  console.log("Treasury    :", treasury);
  console.log("OrgRegistry :", address);
  console.log(`Deployment saved -> ${outPath}`);
  console.log("Set envs:");
  console.log("  ORG_REGISTRY_ADDRESS=", address);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
