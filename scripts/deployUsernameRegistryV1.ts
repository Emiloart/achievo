import { network } from "hardhat";

async function main() {
  const operator = process.env.USERNAME_OPERATOR_ADDRESS;
  if (!operator) {
    throw new Error("USERNAME_OPERATOR_ADDRESS is required");
  }

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  const Registry = await ethers.getContractFactory("AchievoUsernameRegistryV1");
  const registry = await Registry.deploy(operator);
  await registry.waitForDeployment();
  const registryAddr = await registry.getAddress();

  console.log("Deployed by :", deployer.address);
  console.log("Operator    :", operator);
  console.log("UsernameRegistry:", registryAddr);
  console.log("Set envs:");
  console.log("  NEXT_PUBLIC_ACHIEVO_USERNAME_REGISTRY_ADDRESS=", registryAddr);
  console.log("  ACHIEVO_USERNAME_REGISTRY_ADDRESS=", registryAddr);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
