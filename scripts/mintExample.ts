// scripts/mintExample.ts
import { network } from "hardhat";
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Deployments = {
  network: string;
  chainId: number;
  contracts: {
    AchievoCore?: { address: string };
    BadgeSBT?: { address: string };
  };
};

function loadDeploymentFor(netName: string): Deployments | undefined {
  try {
    const path = join(process.cwd(), `deployments/${netName}.json`);
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    // Fallback: known alias for Base Sepolia
    if (netName.toLowerCase() === "basesepolia") {
      try {
        const path = join(process.cwd(), `deployments/base-sepolia.json`);
        return JSON.parse(readFileSync(path, "utf8"));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

async function main() {
  const { ethers } = await network.connect();
  const [signer] = await ethers.getSigners();

  const netName = (await ethers.provider.getNetwork()).name ?? network.name;
  const dep = loadDeploymentFor(netName);

  const CORE_ADDRESS = process.env.CORE_ADDRESS || dep?.contracts.AchievoCore?.address;
  const BADGE_ADDRESS = process.env.BADGE_ADDRESS || dep?.contracts.BadgeSBT?.address;

  if (!CORE_ADDRESS || !BADGE_ADDRESS) {
    throw new Error(`Missing CORE_ADDRESS/BADGE_ADDRESS. Set env vars or provide deployments/${netName}.json`);
  }

  const GOAL_CID = process.env.GOAL_CID || "ipfs://goal-cid";
  const EVIDENCE_CID = process.env.EVIDENCE_CID; // optional
  const BADGE_URI = process.env.BADGE_URI || "ipfs://badge-meta-cid";

  const core = await ethers.getContractAt("AchievoCore", CORE_ADDRESS);
  const badge = await ethers.getContractAt("BadgeSBT", BADGE_ADDRESS);

  console.log("Using signer:", signer.address);
  console.log("AchievoCore:", CORE_ADDRESS);
  console.log("BadgeSBT   :", BADGE_ADDRESS);

  const tx1 = await core.createGoal(GOAL_CID);
  await tx1.wait();
  const goalId = (await core.nextGoalId()) - 1n;
  console.log("Created goal id:", goalId.toString());

  if (EVIDENCE_CID) {
    await (await core.submitProof(goalId, EVIDENCE_CID)).wait();
    console.log("Submitted evidence:", EVIDENCE_CID);
  }

  await (await core.selfVerify(goalId)).wait();
  console.log("Self verified goal:", goalId.toString());

  await (await core.mintBadge(goalId, BADGE_URI)).wait();
  console.log("Minted badge with tokenURI:", BADGE_URI);

  const owner = await badge.ownerOf(goalId);
  console.log("Badge owner:", owner);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
