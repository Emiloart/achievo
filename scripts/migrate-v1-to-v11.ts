/**
 * Migration script: Achievo v1 -> v1.1
 *
 * Reads legacy v1 contracts (addresses provided) using canonical v1 ABIs,
 * extracts goals and badges, then imports them into AchievoCoreV11/AchievoBadgeV11.
 *
 * This script is standalone and should NOT be part of the Nest runtime.
 */
import { createPublicClient, createWalletClient, http, parseAbiItem } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import AchievoCoreV1 from "../deployments/abi/AchievoCore.json" assert { type: "json" };
import BadgeSbtV1 from "../deployments/abi/BadgeSBT.json" assert { type: "json" };
import { achievoCoreV11Abi, achievoBadgeV11Abi } from "../packages/achievo-abi";
import { ACHIEVO_CORE_V11_ADDRESS, ACHIEVO_BADGE_V11_ADDRESS, BASE_SEPOLIA_RPC } from "../packages/achievo-config";

const CORE_V1 = (process.env.ACHIEVO_CORE_V1_ADDRESS || "0xAdBf86ec7Acef2921e038883c6c04166851f0a16") as `0x${string}`;
const BADGE_V1 = (process.env.ACHIEVO_BADGE_V1_ADDRESS ||
  "0x5E04f674BDa4b9429c408935C9D6aE0655eE7055") as `0x${string}`;

const PK = process.env.MIGRATOR_PRIVATE_KEY || "";

if (!PK) {
  throw new Error("Set MIGRATOR_PRIVATE_KEY for migration");
}

const account = privateKeyToAccount(`0x${PK.replace(/^0x/, "")}`);

const rpc = BASE_SEPOLIA_RPC;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(rpc),
});

const walletClient = createWalletClient({
  account,
  chain: baseSepolia,
  transport: http(rpc),
});

type LegacyGoal = {
  goalId: bigint;
  creator: `0x${string}`;
  goalCID: string;
  evidenceCID: string;
  level: number;
  approvals: number;
  createdAt: bigint;
  verified: boolean;
  badgeMinted: boolean;
  peersRestricted: boolean;
  legacyTxHash: `0x${string}`;
};

async function fetchLegacyGoals(): Promise<LegacyGoal[]> {
  const goalCreatedEvent = parseAbiItem(
    "event GoalCreated(uint256 indexed goalId, address indexed creator, string goalCID)",
  );
  const logs = await publicClient.getLogs({
    address: CORE_V1,
    event: goalCreatedEvent,
    fromBlock: 0n,
    toBlock: "latest",
  });

  const goals: LegacyGoal[] = [];
  for (const log of logs) {
    const legacyId = log.args.goalId as bigint;
    let extra: any = {};
    try {
      extra = await publicClient.readContract({
        address: CORE_V1,
        abi: AchievoCoreV1.abi as any,
        functionName: "getGoal",
        args: [legacyId],
      });
    } catch {
      extra = {};
    }
    goals.push({
      goalId: legacyId,
      creator: (log.args.creator || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      goalCID: (log.args.goalCID as string) || "",
      evidenceCID: extra.evidenceCID || "",
      level: Number(extra.level || 0),
      approvals: Number(extra.approvals || 0),
      createdAt: (extra.createdAt as bigint) || log.blockNumber || 0n,
      verified: Boolean(extra.verified),
      badgeMinted: Boolean(extra.badgeMinted),
      peersRestricted: Boolean(extra.peersRestricted),
      legacyTxHash: log.transactionHash,
    });
  }
  return goals;
}

async function importGoals(goals: LegacyGoal[]) {
  for (const g of goals) {
    const { request } = await publicClient.simulateContract({
      address: ACHIEVO_CORE_V11_ADDRESS as `0x${string}`,
      abi: achievoCoreV11Abi as any,
      functionName: "importGoalFromLegacy",
      args: [
        g.creator,
        g.goalCID,
        g.evidenceCID,
        g.level,
        g.approvals,
        g.verified,
        g.badgeMinted,
        g.peersRestricted,
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
        0,
        Number(g.createdAt),
        g.goalId,
        g.legacyTxHash,
      ],
      account,
    });
    await walletClient.writeContract(request);
  }
}

async function migrateBadges() {
  // v1 badge lacks enumeration; attempt to mirror ownerOf(goalId) for imported goals
  const goalCount = 500n; // adjust upper bound if needed
  for (let tokenId = 1n; tokenId <= goalCount; tokenId++) {
    let owner: `0x${string}` | null = null;
    try {
      owner = (await publicClient.readContract({
        address: BADGE_V1,
        abi: BadgeSbtV1.abi as any,
        functionName: "ownerOf",
        args: [tokenId],
      })) as `0x${string}`;
    } catch {
      continue;
    }
    if (!owner || owner === "0x0000000000000000000000000000000000000000") continue;
    try {
      const tokenURI = (await publicClient.readContract({
        address: BADGE_V1,
        abi: BadgeSbtV1.abi as any,
        functionName: "tokenURI",
        args: [tokenId],
      })) as string;
      const { request } = await publicClient.simulateContract({
        address: ACHIEVO_BADGE_V11_ADDRESS as `0x${string}`,
        abi: achievoBadgeV11Abi as any,
        functionName: "mint",
        args: [owner, tokenId, tokenURI],
        account,
      });
      await walletClient.writeContract(request);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`badge migrate token ${tokenId} failed`, err);
    }
  }
}

async function main() {
  const goals = await fetchLegacyGoals();
  await importGoals(goals);
  await migrateBadges();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
