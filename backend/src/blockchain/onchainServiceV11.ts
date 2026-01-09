import { Injectable } from "@nestjs/common";
import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { achievoCoreV11Abi, achievoBadgeV11Abi } from "../../../packages/achievo-abi";
import {
  BASE_SEPOLIA_RPC,
  ACHIEVO_CORE_V11_ADDRESS,
  ACHIEVO_BADGE_V11_ADDRESS,
  ACHIEVO_IDENTITY_ADDRESS,
} from "../../../packages/achievo-config";
import AchievoIdentity from "../../../deployments/abi/AchievoIdentity.json";
import { toAchusrId } from "../identity/username.util";

type JsonGoal = {
  id: number;
  creator: string;
  goalCID: string;
  evidenceCID: string;
  level: number;
  approvals: number;
  createdAt: number;
  verified: boolean;
  badgeMinted: boolean;
  peersRestricted: boolean;
  autoVerifier: string;
  autoDataHash: string;
  autoVerifiedAt: number;
  legacyId: string;
  legacyTxHash: string;
};

@Injectable()
export class OnchainServiceV11 {
  private client = createPublicClient({
    chain: baseSepolia,
    transport: http(BASE_SEPOLIA_RPC),
  });

  async getGoalsByCreator(address: `0x${string}`): Promise<JsonGoal[]> {
    try {
      const result = (await this.client.readContract({
        address: ACHIEVO_CORE_V11_ADDRESS as `0x${string}`,
        abi: achievoCoreV11Abi as any,
        functionName: "getGoalsByCreator",
        args: [address],
      })) as any[];
      return (result || []).map(this.mapGoal);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("getGoalsByCreator v1.1 error", err);
      return [];
    }
  }

  async getGoalById(goalId: number): Promise<JsonGoal | null> {
    try {
      const result = (await this.client.readContract({
        address: ACHIEVO_CORE_V11_ADDRESS as `0x${string}`,
        abi: achievoCoreV11Abi as any,
        functionName: "getGoal",
        args: [BigInt(goalId)],
      })) as any;
      return this.mapGoal(result);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("getGoal v1.1 error", err);
      return null;
    }
  }

  async getBadgesByOwner(address: `0x${string}`): Promise<number[]> {
    try {
      const tokens = (await this.client.readContract({
        address: ACHIEVO_BADGE_V11_ADDRESS as `0x${string}`,
        abi: achievoBadgeV11Abi as any,
        functionName: "tokensOfOwner",
        args: [address],
      })) as bigint[];
      return tokens.map((t) => Number(t));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("getBadgesByOwner v1.1 error", err);
      return [];
    }
  }

  private mapGoal = (g: any): JsonGoal => ({
    id: Number(g.id ?? 0),
    creator: g.creator,
    goalCID: g.goalCID ?? "",
    evidenceCID: g.evidenceCID ?? "",
    level: Number(g.level ?? 0),
    approvals: Number(g.approvals ?? 0),
    createdAt: Number(g.createdAt ?? 0),
    verified: Boolean(g.verified),
    badgeMinted: Boolean(g.badgeMinted),
    peersRestricted: Boolean(g.peersRestricted),
    autoVerifier: g.autoVerifier ?? "0x0000000000000000000000000000000000000000",
    autoDataHash: g.autoDataHash ?? "0x",
    autoVerifiedAt: Number(g.autoVerifiedAt ?? 0),
    legacyId: (g.legacyId ?? 0n).toString(),
    legacyTxHash: g.legacyTxHash ?? "0x",
  });

  async getUserId(address: `0x${string}`): Promise<bigint> {
    const userId = (await this.client.readContract({
      address: ACHIEVO_IDENTITY_ADDRESS as `0x${string}`,
      abi: AchievoIdentity.abi as any,
      functionName: "getUserId",
      args: [address],
    })) as bigint;
    return userId;
  }

  async getUserProfile(address: `0x${string}`) {
    try {
      const userId = await this.getUserId(address);
      if (!userId || userId === 0n) {
        return {
          achusrId: "",
          username: "",
          bio: "",
          about: "",
          avatar: "",
        };
      }
      const profile = (await this.client.readContract({
        address: ACHIEVO_IDENTITY_ADDRESS as `0x${string}`,
        abi: AchievoIdentity.abi as any,
        functionName: "getProfile",
        args: [userId],
      })) as any;
      const username = profile?.username ?? profile?.[0] ?? "";
      const bio = profile?.bio ?? profile?.[1] ?? "";
      const about = profile?.about ?? profile?.[2] ?? "";
      const avatar = profile?.avatar ?? profile?.[3] ?? "";
      return {
        achusrId: toAchusrId(userId),
        username,
        bio,
        about,
        avatar,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("getUserProfile v1.1 error", err);
      return {
        achusrId: "",
        username: "",
        bio: "",
        about: "",
        avatar: "",
      };
    }
  }

  private formatAchievoId(userId: bigint) {
    if (!userId || userId === 0n) return "";
    return toAchusrId(userId);
  }
}
