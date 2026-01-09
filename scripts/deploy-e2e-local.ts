import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();
  const [deployer, treasurySigner, operatorSigner] = await ethers.getSigners();

  const feeRaw = process.env.E2E_ORG_FEE || "1000000000000000";
  const fee = BigInt(feeRaw);

  const treasury = process.env.E2E_ORG_TREASURY || treasurySigner.address;
  const operator = process.env.E2E_ANCHOR_OPERATOR || operatorSigner.address;

  const OrgRegistry = await ethers.getContractFactory("AchievoOrgRegistry");
  const orgRegistry = await OrgRegistry.deploy(fee, treasury, deployer.address);
  await orgRegistry.waitForDeployment();

  const AnchorRegistry = await ethers.getContractFactory("AchievoAnchorRegistry");
  const anchorRegistry = await AnchorRegistry.deploy(operator);
  await anchorRegistry.waitForDeployment();

  const UsernameRegistry = await ethers.getContractFactory("AchievoUsernameRegistryV1");
  const usernameRegistry = await UsernameRegistry.deploy(operator);
  await usernameRegistry.waitForDeployment();

  const Identity = await ethers.getContractFactory("AchievoIdentity");
  const identity = await Identity.deploy();
  await identity.waitForDeployment();

  const chain = await ethers.provider.getNetwork();
  const chainId = Number(chain.chainId);

  const deployment = {
    network: network.name,
    chainId,
    deployer: deployer.address,
    treasury,
    orgRegistry: await orgRegistry.getAddress(),
    orgCreateFee: fee.toString(),
    anchorRegistry: await anchorRegistry.getAddress(),
    anchorOperator: operator,
    usernameRegistry: await usernameRegistry.getAddress(),
    usernameOperator: operator,
    identity: await identity.getAddress(),
    timestamp: new Date().toISOString(),
  };

  const outDir = join(process.cwd(), "contracts", "deployments", "local");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "e2e.json");
  writeFileSync(outPath, JSON.stringify(deployment, null, 2));

  console.log("Deployed by       :", deployer.address);
  console.log("Org registry      :", deployment.orgRegistry);
  console.log("Org fee           :", deployment.orgCreateFee);
  console.log("Org treasury      :", deployment.treasury);
  console.log("Anchor registry   :", deployment.anchorRegistry);
  console.log("Anchor operator   :", deployment.anchorOperator);
  console.log("Username registry :", deployment.usernameRegistry);
  console.log("Username operator :", deployment.usernameOperator);
  console.log("Identity contract :", deployment.identity);
  console.log(`Deployment saved  -> ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
