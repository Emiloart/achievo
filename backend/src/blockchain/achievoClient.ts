import { ConfigService } from "@nestjs/config";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import AchievoCore from "../../../deployments/abi/AchievoCore.json";
import BadgeSBT from "../../../deployments/abi/BadgeSBT.json";
import { ACHIEVO_CORE_ADDRESS, ACHIEVO_BADGE_ADDRESS, BASE_SEPOLIA_RPC } from "../config";

const achievoCoreAbi = (AchievoCore as any).abi as any;
const achievoBadgeAbi = (BadgeSBT as any).abi as any;

const identityAbi = [
  {
    inputs: [{ internalType: "address", name: "wallet", type: "address" }],
    name: "getUserId",
    outputs: [{ internalType: "uint96", name: "", type: "uint96" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint96", name: "userId", type: "uint96" }],
    name: "getProfile",
    outputs: [
      {
        components: [
          { internalType: "string", name: "username", type: "string" },
          { internalType: "string", name: "bio", type: "string" },
          { internalType: "string", name: "about", type: "string" },
          { internalType: "string", name: "avatar", type: "string" },
        ],
        internalType: "struct AchievoIdentity.Profile",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

@Injectable()
export class AchievoClient {
  private readonly coreAddress: `0x${string}`;
  private readonly badgeAddress: `0x${string}`;
  private readonly identityAddress: `0x${string}`;
  private readonly client;

  constructor(private readonly config: ConfigService) {
    const rpcUrl = this.config.get<string>("RPC_URL") || BASE_SEPOLIA_RPC;
    const core = (this.config.get<string>("CORE_ADDRESS") || ACHIEVO_CORE_ADDRESS) as `0x${string}`;
    const badge = (this.config.get<string>("BADGE_ADDRESS") || ACHIEVO_BADGE_ADDRESS) as `0x${string}`;
    const identity = this.config.get<string>("IDENTITY_ADDRESS");
    if (!rpcUrl || !core || !badge || !identity) {
      throw new Error("RPC_URL/BASE_SEPOLIA_RPC, CORE_ADDRESS, BADGE_ADDRESS, and IDENTITY_ADDRESS must be set");
    }
    this.coreAddress = core;
    this.badgeAddress = badge;
    this.identityAddress = identity as `0x${string}`;
    this.client = createPublicClient({
      chain: baseSepolia,
      transport: http(rpcUrl),
    });
  }

  private formatAchievoId(userId: bigint) {
    if (!userId || userId === 0n) return "";
    const digits = userId.toString().padStart(10, "0");
    return `ACHUSR-${digits}`;
  }

  async fetchUserTasks(userAddress: `0x${string}`) {
    try {
      // Use GoalCreated events to avoid ABI drift on getGoal.
      const coreEvent = (achievoCoreAbi as any[]).find((a) => a.type === "event" && a.name === "GoalCreated");
      if (!coreEvent) return [];
      const logs = await this.client.getLogs({
        address: this.coreAddress,
        event: coreEvent as any,
        // topics: [signature, null, creator] — viem fills from args
        args: { creator: userAddress },
        fromBlock: 0n,
        toBlock: "latest",
      });
      // Map to a uniform shape; fields not present in the event are defaulted.
      return logs
        .filter((log: any) => log?.args?.creator?.toLowerCase?.() === userAddress.toLowerCase())
        .map((log: any) => ({
          id: Number(log.args.goalId ?? 0),
          creator: log.args.creator,
          goalCID: log.args.goalCID ?? "",
          evidenceCID: "",
          level: 0,
          approvals: 0,
          createdAt: "0",
          verified: false,
          badgeMinted: false,
          peersRestricted: false,
          autoVerifier: "0x0000000000000000000000000000000000000000",
          autoDataHash: "0x0000000000000000000000000000000000000000000000000000000000000000",
          autoVerifiedAt: "0",
        }));
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("fetchUserTasks logs error", err?.message || err);
      return [];
    }
  }

  async fetchUserBadges(userAddress: `0x${string}`) {
    try {
      // This contract doesn't expose enumeration; attempt balanceOf then ownerOf/tokenURI for known range
      const balance = (await this.client.readContract({
        address: this.badgeAddress,
        abi: achievoBadgeAbi as any,
        functionName: "balanceOf",
        args: [userAddress],
      })) as bigint;

      // If no balance, short-circuit
      if (!balance || balance === 0n) return [];

      // Without enumeration we can't derive tokenIds reliably; fallback to empty to avoid blocking UI
      return [];
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("fetchUserBadges revert", err?.message || err);
      return [];
    }
  }

  async fetchUserProfile(userAddress: `0x${string}`) {
    try {
      const userId = (await this.client.readContract({
        address: this.identityAddress,
        abi: identityAbi as any,
        functionName: "getUserId",
        args: [userAddress],
      })) as bigint;

      if (!userId || userId === 0n) {
        return {
          achievoId: "",
          username: "",
          bio: "",
          about: "",
          avatar: "",
        };
      }

      const profile = (await this.client.readContract({
        address: this.identityAddress,
        abi: identityAbi as any,
        functionName: "getProfile",
        args: [userId],
      })) as readonly [string, string, string, string];

      return {
        achievoId: this.formatAchievoId(userId),
        username: profile?.[0] ?? "",
        bio: profile?.[1] ?? "",
        about: profile?.[2] ?? "",
        avatar: profile?.[3] ?? "",
      };
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("fetchUserProfile revert", err?.message || err);
      return {
        achievoId: "",
        username: "",
        bio: "",
        about: "",
        avatar: "",
      };
    }
  }
}
