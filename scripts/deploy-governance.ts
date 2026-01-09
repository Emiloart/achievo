import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { network } from "hardhat";

async function main() {
  const multisig = process.env.MULTISIG_ADDRESS || "";
  if (!multisig) {
    throw new Error("MULTISIG_ADDRESS is required");
  }

  const minDelay = Number(process.env.TIMELOCK_MIN_DELAY || 24 * 60 * 60);
  if (!Number.isFinite(minDelay) || minDelay < 0) {
    throw new Error("TIMELOCK_MIN_DELAY must be a non-negative number");
  }

  const admin = process.env.TIMELOCK_ADMIN || multisig;

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  const Timelock = await ethers.getContractFactory("TimelockController");
  const timelock = await Timelock.deploy(minDelay, [multisig], [multisig], admin);
  await timelock.waitForDeployment();
  const timelockAddr = await timelock.getAddress();

  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);

  const deployment = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    multisig,
    admin,
    minDelay,
    timelock: timelockAddr,
    timestamp: new Date().toISOString(),
  };

  const outDir = join(process.cwd(), "deployments", "base-sepolia");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "governance.json");
  writeFileSync(outPath, JSON.stringify(deployment, null, 2));

  console.log("Deployed by :", deployer.address);
  console.log("Multisig    :", multisig);
  console.log("Admin       :", admin);
  console.log("Timelock    :", timelockAddr);
  console.log("MinDelay    :", minDelay);
  console.log(`Deployment saved -> ${outPath}`);
  console.log("Set envs:");
  console.log("  TIMELOCK_ADDRESS=", timelockAddr);
  console.log("  MULTISIG_ADDRESS=", multisig);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
