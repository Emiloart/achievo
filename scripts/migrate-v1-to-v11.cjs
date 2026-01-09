// Migration script v1 -> v1.1 (CommonJS)
const { createPublicClient, createWalletClient, http, parseAbiItem } = require("viem");
const { baseSepolia } = require("viem/chains");
const { privateKeyToAccount } = require("viem/accounts");
const AchievoCoreV1Abi = [
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previous", type: "address" },
      { indexed: true, internalType: "address", name: "current", type: "address" },
    ],
    name: "BadgeAddressUpdated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "goalId", type: "uint256" },
      { indexed: true, internalType: "address", name: "to", type: "address" },
      { indexed: false, internalType: "string", name: "tokenURI", type: "string" },
    ],
    name: "BadgeMinted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "goalId", type: "uint256" },
      { indexed: true, internalType: "address", name: "creator", type: "address" },
      { indexed: false, internalType: "string", name: "goalCID", type: "string" },
    ],
    name: "GoalCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "previousOwner", type: "address" },
      { indexed: true, internalType: "address", name: "newOwner", type: "address" },
    ],
    name: "OwnershipTransferred",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "goalId", type: "uint256" },
      { indexed: true, internalType: "address", name: "approver", type: "address" },
      { indexed: false, internalType: "uint8", name: "approvals", type: "uint8" },
      { indexed: false, internalType: "uint8", name: "threshold", type: "uint8" },
    ],
    name: "PeerApproved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "goalId", type: "uint256" },
      { indexed: false, internalType: "string", name: "evidenceCID", type: "string" },
    ],
    name: "ProofSubmitted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "goalId", type: "uint256" },
      { indexed: true, internalType: "address", name: "by", type: "address" },
    ],
    name: "SelfVerified",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "goalId", type: "uint256" },
      { indexed: false, internalType: "enum AchievoCore.VerifyLevel", name: "level", type: "uint8" },
    ],
    name: "Verified",
    type: "event",
  },
  {
    inputs: [{ internalType: "uint256", name: "goalId", type: "uint256" }],
    name: "approve",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "badge",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "string", name: "goalCID", type: "string" }],
    name: "createGoal",
    outputs: [{ internalType: "uint256", name: "goalId", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "goalId", type: "uint256" }],
    name: "getGoal",
    outputs: [
      {
        components: [
          { internalType: "uint256", name: "id", type: "uint256" },
          { internalType: "address", name: "creator", type: "address" },
          { internalType: "string", name: "goalCID", type: "string" },
          { internalType: "string", name: "evidenceCID", type: "string" },
          { internalType: "enum AchievoCore.VerifyLevel", name: "level", type: "uint8" },
          { internalType: "uint8", name: "approvals", type: "uint8" },
          { internalType: "uint64", name: "createdAt", type: "uint64" },
          { internalType: "bool", name: "verified", type: "bool" },
          { internalType: "bool", name: "badgeMinted", type: "bool" },
        ],
        internalType: "struct AchievoCore.Goal",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "goalId", type: "uint256" },
      { internalType: "address", name: "approver", type: "address" },
    ],
    name: "isApprovedBy",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "goalId", type: "uint256" }],
    name: "isVerified",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "goalId", type: "uint256" },
      { internalType: "string", name: "tokenURI_", type: "string" },
    ],
    name: "mintBadge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "nextGoalId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "peerThreshold",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "goalId", type: "uint256" }],
    name: "selfVerify",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "badgeAddr", type: "address" }],
    name: "setBadge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint8", name: "newThreshold", type: "uint8" }],
    name: "setPeerThreshold",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "goalId", type: "uint256" },
      { internalType: "string", name: "evidenceCID", type: "string" },
    ],
    name: "submitProof",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "newOwner", type: "address" }],
    name: "transferOwnership",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint256", name: "goalId", type: "uint256" },
      { internalType: "bytes", name: "", type: "bytes" },
    ],
    name: "verifyAuto",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];
const BadgeSbtV1 = require("../deployments/abi/BadgeSBT.json");
const { achievoCoreV11Abi, achievoBadgeV11Abi } = require("../packages/achievo-abi");
const { ACHIEVO_CORE_V11_ADDRESS, ACHIEVO_BADGE_V11_ADDRESS, BASE_SEPOLIA_RPC } = require("../packages/achievo-config");

const CORE_V1 = process.env.ACHIEVO_CORE_V1_ADDRESS || "0xAdBf86ec7Acef2921e038883c6c04166851f0a16";
const BADGE_V1 = process.env.ACHIEVO_BADGE_V1_ADDRESS || "0x5E04f674BDa4b9429c408935C9D6aE0655eE7055";

const PK = process.env.MIGRATOR_PRIVATE_KEY || "";
if (!PK) throw new Error("Set MIGRATOR_PRIVATE_KEY for migration");

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

async function fetchLegacyGoals() {
  const nextId = await publicClient.readContract({
    address: CORE_V1,
    abi: AchievoCoreV1Abi,
    functionName: "nextGoalId",
  });
  const maxId = Number(nextId || 0n);
  const goals = [];
  const concurrency = 3;
  let current = 1;

  const goalCreatedEvent = parseAbiItem(
    "event GoalCreated(uint256 indexed goalId, address indexed creator, string goalCID)",
  );

  async function fetchOne(id) {
    let extra = {};
    try {
      extra = await publicClient.readContract({
        address: CORE_V1,
        abi: AchievoCoreV1Abi,
        functionName: "getGoal",
        args: [BigInt(id)],
      });
    } catch (err) {
      console.error(`getGoal(${id}) failed`, err?.message || err);
      return;
    }

    // Optional: fetch legacy tx hash via narrow log range (<=10 blocks)
    let legacyTxHash = "0x";
    try {
      const blkNum = extra.createdAt && extra.createdAt !== 0n ? extra.createdAt : 0n;
      const from = blkNum > 0n ? blkNum : 0n;
      const to = from + 9n;
      const logs = await publicClient.getLogs({
        address: CORE_V1,
        event: goalCreatedEvent,
        args: { goalId: BigInt(id) },
        fromBlock: from,
        toBlock: to,
      });
      if (logs.length > 0) {
        legacyTxHash = logs[0].transactionHash;
      }
    } catch (err) {
      // Ignore log lookup failures on free-tier limits
    }

    let createdAt = extra.createdAt || 0n;
    if (createdAt == 0n) {
      try {
        const blk = await publicClient.getBlock({ blockNumber: BigInt(id) });
        createdAt = blk?.timestamp ?? 0n;
      } catch {
        createdAt = 0n;
      }
    }

    goals.push({
      goalId: BigInt(id),
      creator: extra.creator || "0x0000000000000000000000000000000000000000",
      goalCID: extra.goalCID || "",
      evidenceCID: extra.evidenceCID || "",
      level: Number(extra.level || 0),
      approvals: Number(extra.approvals || 0),
      createdAt,
      verified: Boolean(extra.verified),
      badgeMinted: Boolean(extra.badgeMinted),
      peersRestricted: Boolean(extra.peersRestricted),
      legacyTxHash,
    });
  }

  async function worker() {
    while (true) {
      const id = current++;
      if (id >= maxId) break;
      await fetchOne(id);
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return goals;
}

async function importGoals(goals) {
  for (const g of goals) {
    const safeLegacyTxHash =
      g.legacyTxHash && g.legacyTxHash.length === 66
        ? g.legacyTxHash
        : "0x0000000000000000000000000000000000000000000000000000000000000000";
    const { request } = await publicClient.simulateContract({
      address: ACHIEVO_CORE_V11_ADDRESS,
      abi: achievoCoreV11Abi,
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
        safeLegacyTxHash,
      ],
      account,
    });
    await walletClient.writeContract(request);
  }
}

async function migrateBadges() {
  const goalCount = 2000n; // adjust if needed
  for (let tokenId = 1n; tokenId <= goalCount; tokenId++) {
    // Skip if already minted in v1.1
    try {
      const existing = await publicClient.readContract({
        address: ACHIEVO_BADGE_V11_ADDRESS,
        abi: achievoBadgeV11Abi,
        functionName: "ownerOf",
        args: [tokenId],
      });
      if (existing && existing !== "0x0000000000000000000000000000000000000000") {
        continue;
      }
    } catch {
      // ownerOf throws if not minted; proceed to migrate
    }

    let owner = null;
    try {
      owner = await publicClient.readContract({
        address: BADGE_V1,
        abi: BadgeSbtV1.abi,
        functionName: "ownerOf",
        args: [tokenId],
      });
    } catch {
      continue;
    }
    if (!owner || owner === "0x0000000000000000000000000000000000000000") continue;
    try {
      const tokenURI = await publicClient.readContract({
        address: BADGE_V1,
        abi: BadgeSbtV1.abi,
        functionName: "tokenURI",
        args: [tokenId],
      });
      const { request } = await publicClient.simulateContract({
        address: ACHIEVO_BADGE_V11_ADDRESS,
        abi: achievoBadgeV11Abi,
        functionName: "mint",
        args: [owner, tokenId, tokenURI],
        account,
      });
      await walletClient.writeContract(request);
    } catch (err) {
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
  console.error(err);
  process.exit(1);
});
