import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  const Identity = await ethers.getContractFactory("AchievoIdentity");
  const identity = await Identity.deploy();
  await identity.waitForDeployment();
  const addr = await identity.getAddress();

  console.log("Deployer       :", deployer.address);
  console.log("AchievoIdentity:", addr);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
