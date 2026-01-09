import { network } from "hardhat";

async function main() {
  const operator = process.env.PROOF_ANCHOR_OPERATOR_ADDRESS;
  if (!operator) {
    throw new Error("PROOF_ANCHOR_OPERATOR_ADDRESS is required");
  }

  const { ethers } = await network.connect();
  const [deployer] = await ethers.getSigners();

  const Registry = await ethers.getContractFactory("ProofAnchorRegistry");
  const registry = await Registry.deploy(operator);
  await registry.waitForDeployment();
  const addr = await registry.getAddress();

  console.log("Deployed by :", deployer.address);
  console.log("Operator    :", operator);
  console.log("ProofAnchorRegistry:", addr);
  console.log("Set envs:");
  console.log("  PROOF_ANCHOR_CONTRACT_ADDRESS=", addr);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
