// scripts/deploy.ts
import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  // Config via env (fallbacks provided)
  const BADGE_NAME = process.env.BADGE_NAME || "Achievo Badge";
  const BADGE_SYMBOL = process.env.BADGE_SYMBOL || "ACHV";
  const PEER_THRESHOLD = process.env.PEER_THRESHOLD ? parseInt(process.env.PEER_THRESHOLD, 10) : undefined;

  // 1) Deploy AchievoIdentity
  const Identity = await ethers.getContractFactory("AchievoIdentity");
  const identity = await Identity.deploy();
  await identity.waitForDeployment();
  const identityAddr = await identity.getAddress();

  // 2) Deploy BadgeSBT (owner = deployer)
  const BadgeSBT = await ethers.getContractFactory("BadgeSBT");
  const badge = await BadgeSBT.deploy(BADGE_NAME, BADGE_SYMBOL, deployer.address);
  await badge.waitForDeployment();
  const badgeAddr = await badge.getAddress();

  // 3) Deploy AchievoCore (owner = deployer via constructor)
  const AchievoCore = await ethers.getContractFactory("AchievoCore");
  const core = await AchievoCore.deploy();
  await core.waitForDeployment();
  const coreAddr = await core.getAddress();

  // 4) Link them (core is authorized minter; core knows badge address)
  await (await badge.setCore(coreAddr)).wait();
  await (await core.setBadge(badgeAddr)).wait();

  // 5) Optional: set peer threshold if provided
  if (PEER_THRESHOLD !== undefined) {
    await (await core.setPeerThreshold(PEER_THRESHOLD)).wait();
  }

  const threshold = await core.peerThreshold();

  console.log("Deployed by :", deployer.address);
  console.log("AchievoIdentity:", identityAddr);
  console.log("BadgeSBT      :", badgeAddr);
  console.log("AchievoCore   :", coreAddr);
  console.log("PeerThreshold:", Number(threshold));
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
