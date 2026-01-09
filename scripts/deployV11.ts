import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { network } from "hardhat";

async function main() {
  const timelock = process.env.TIMELOCK_ADDRESS || "";
  if (!timelock) {
    throw new Error("TIMELOCK_ADDRESS is required to own AchievoCoreV11 and AchievoBadgeV12");
  }

  const badgeName = process.env.BADGE_NAME || "Achievo Badge V1.2";
  const badgeSymbol = process.env.BADGE_SYMBOL || "ACHB";

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  // Deploy CoreV11 (owner = deployer for bootstrap)
  const Core = await ethers.getContractFactory("AchievoCoreV11");
  const core = await Core.deploy();
  await core.waitForDeployment();
  const coreAddr = await core.getAddress();

  // Deploy BadgeV12 (admin = timelock, minter = core)
  const Badge = await ethers.getContractFactory("AchievoBadgeV12");
  const badge = await Badge.deploy(timelock, coreAddr, badgeName, badgeSymbol);
  await badge.waitForDeployment();
  const badgeAddr = await badge.getAddress();

  // Wire badge to core
  await (await core.setBadge(badgeAddr)).wait();

  // Transfer core ownership to timelock governance
  await (await core.transferOwnership(timelock)).wait();

  const threshold = await core.peerThreshold();

  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);
  const outDir = join(process.cwd(), "deployments", "base-sepolia");
  mkdirSync(outDir, { recursive: true });
  const badgeOut = join(outDir, "achievoBadge.json");
  const coreOut = join(outDir, "achievoCore.json");

  writeFileSync(
    badgeOut,
    JSON.stringify(
      {
        network: network.name,
        chainId,
        deployer: deployer.address,
        timelock,
        address: badgeAddr,
        name: badgeName,
        symbol: badgeSymbol,
        version: "v1.2",
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  writeFileSync(
    coreOut,
    JSON.stringify(
      {
        network: network.name,
        chainId,
        deployer: deployer.address,
        timelock,
        address: coreAddr,
        badge: badgeAddr,
        version: "v1.1",
        timestamp: new Date().toISOString(),
      },
      null,
      2,
    ),
  );

  console.log("Deployed by :", deployer.address);
  console.log("Timelock    :", timelock);
  console.log("AchievoBadgeV12:", badgeAddr);
  console.log("AchievoCoreV11 :", coreAddr);
  console.log("PeerThreshold  :", Number(threshold));
  console.log(`Deployment saved -> ${badgeOut}`);
  console.log(`Deployment saved -> ${coreOut}`);
  console.log("Set envs:");
  console.log("  NEXT_PUBLIC_ACHIEVO_CORE_V11_ADDRESS=", coreAddr);
  console.log("  NEXT_PUBLIC_ACHIEVO_BADGE_V11_ADDRESS=", badgeAddr);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
