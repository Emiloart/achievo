/**
 * Goal lifecycle projector for legacy core events.
 *
 * Builds authoritative state from event history without default inference.
 */
import { PrismaService } from "../../prisma/prisma.service";
import type { DecodedEventRow } from "./projector.types";
import { ChainClient } from "../chain.client";

const ZERO = "0x0000000000000000000000000000000000000000";

function normalizeAddress(value: any) {
  const text = String(value || "").toLowerCase();
  return text.startsWith("0x") ? text : `0x${text}`;
}

function toNumber(value: any) {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function toOptionalString(value: any) {
  if (value === null || value === undefined) return null;
  return String(value);
}

function toTokenId(value: any) {
  return typeof value === "string" ? value : String(value || "0");
}

/** Projects legacy goal state from core events. */
export class LegacyGoalProjector {
  constructor(private readonly prisma: PrismaService, private readonly chain: ChainClient) {}

  async process(events: DecodedEventRow[]) {
    for (const event of events) {
      const contractAddress = normalizeAddress(event.contractAddress);
      switch (event.eventName) {
        case "GoalCreated":
          await this.handleGoalCreated(event, contractAddress);
          break;
        case "ProofSubmitted":
          await this.handleProofSubmitted(event, contractAddress);
          break;
        case "PeerApproved":
          await this.handlePeerApproved(event, contractAddress);
          break;
        case "SelfVerified":
          await this.handleSelfVerified(event, contractAddress);
          break;
        case "Verified":
          await this.handleVerified(event, contractAddress);
          break;
        case "BadgeMinted":
          await this.handleBadgeMinted(event, contractAddress);
          break;
        case "PeerAllowListUpdated":
          await this.handlePeerAllowList(event, contractAddress);
          break;
        case "AutoVerified":
          await this.handleAutoVerified(event, contractAddress);
          break;
        default:
          break;
      }
    }
  }

  private async handleGoalCreated(event: DecodedEventRow, contractAddress: string) {
    const goalId = toTokenId(event.args.goalId);
    const creator = normalizeAddress(event.args.creator);
    const goalCid = toOptionalString(event.args.goalCID);
    const createdAt = await this.chain.getBlockTimestamp(event.blockNumber);
    const createdAtDate = new Date(createdAt * 1000);

    await this.prisma.legacyGoal.upsert({
      where: {
        chainId_contractAddress_goalId: {
          chainId: event.chainId,
          contractAddress,
          goalId,
        },
      },
      update: {
        creatorAddress: creator,
        goalCid,
        createdAtBlock: event.blockNumber,
        createdAtTxHash: event.txHash,
        createdAt: createdAtDate,
        lastUpdatedEventId: event.eventId,
        removed: false,
      },
      create: {
        chainId: event.chainId,
        contractAddress,
        goalId,
        creatorAddress: creator,
        goalCid,
        createdAtBlock: event.blockNumber,
        createdAtTxHash: event.txHash,
        createdAt: createdAtDate,
        lastUpdatedEventId: event.eventId,
        removed: false,
      },
    });
  }

  private async handleProofSubmitted(event: DecodedEventRow, contractAddress: string) {
    const goalId = toTokenId(event.args.goalId);
    const evidenceCid = toOptionalString(event.args.evidenceCID);
    const existing = await this.prisma.legacyGoal.findUnique({
      where: {
        chainId_contractAddress_goalId: {
          chainId: event.chainId,
          contractAddress,
          goalId,
        },
      },
    });
    const submitter = existing?.creatorAddress || ZERO;
    const ts = await this.chain.getBlockTimestamp(event.blockNumber);
    const createdAt = new Date(ts * 1000);

    await this.prisma.legacyGoal.updateMany({
      where: { chainId: event.chainId, contractAddress, goalId },
      data: {
        evidenceCid,
        lastUpdatedEventId: event.eventId,
      },
    });

    await this.prisma.legacyGoalEvidence.upsert({
      where: { eventId: event.eventId },
      update: { removed: false },
      create: {
        chainId: event.chainId,
        contractAddress,
        goalId,
        evidenceCid: evidenceCid || "",
        submitter,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        createdAt,
        eventId: event.eventId,
        removed: false,
      },
    });
  }

  private async handlePeerApproved(event: DecodedEventRow, contractAddress: string) {
    const goalId = toTokenId(event.args.goalId);
    const approver = normalizeAddress(event.args.approver);
    const approvals = toNumber(event.args.approvals);
    const ts = await this.chain.getBlockTimestamp(event.blockNumber);
    const createdAt = new Date(ts * 1000);

    await this.prisma.legacyGoal.updateMany({
      where: { chainId: event.chainId, contractAddress, goalId },
      data: {
        approvals: approvals ?? undefined,
        lastUpdatedEventId: event.eventId,
      },
    });

    await this.prisma.legacyGoalApproval.upsert({
      where: { eventId: event.eventId },
      update: { removed: false },
      create: {
        chainId: event.chainId,
        contractAddress,
        goalId,
        approver,
        approvals: approvals ?? 0,
        txHash: event.txHash,
        blockNumber: event.blockNumber,
        createdAt,
        eventId: event.eventId,
        removed: false,
      },
    });
  }

  private async handleSelfVerified(event: DecodedEventRow, contractAddress: string) {
    const goalId = toTokenId(event.args.goalId);
    await this.prisma.legacyGoal.updateMany({
      where: { chainId: event.chainId, contractAddress, goalId },
      data: {
        verified: true,
        lastUpdatedEventId: event.eventId,
      },
    });
  }

  private async handleVerified(event: DecodedEventRow, contractAddress: string) {
    const goalId = toTokenId(event.args.goalId);
    const level = toNumber(event.args.level);
    await this.prisma.legacyGoal.updateMany({
      where: { chainId: event.chainId, contractAddress, goalId },
      data: {
        verified: true,
        level: level ?? undefined,
        lastUpdatedEventId: event.eventId,
      },
    });
  }

  private async handleBadgeMinted(event: DecodedEventRow, contractAddress: string) {
    const goalId = toTokenId(event.args.goalId);
    await this.prisma.legacyGoal.updateMany({
      where: { chainId: event.chainId, contractAddress, goalId },
      data: {
        badgeMinted: true,
        lastUpdatedEventId: event.eventId,
      },
    });
  }

  private async handlePeerAllowList(event: DecodedEventRow, contractAddress: string) {
    const goalId = toTokenId(event.args.goalId);
    const restricted = Boolean(event.args.restricted);
    await this.prisma.legacyGoal.updateMany({
      where: { chainId: event.chainId, contractAddress, goalId },
      data: {
        peersRestricted: restricted,
        lastUpdatedEventId: event.eventId,
      },
    });
  }

  private async handleAutoVerified(event: DecodedEventRow, contractAddress: string) {
    const goalId = toTokenId(event.args.goalId);
    const verifier = normalizeAddress(event.args.verifier);
    const dataHash = toOptionalString(event.args.dataHash);
    const ts = await this.chain.getBlockTimestamp(event.blockNumber);
    const verifiedAt = new Date(ts * 1000);

    await this.prisma.legacyGoal.updateMany({
      where: { chainId: event.chainId, contractAddress, goalId },
      data: {
        verified: true,
        autoVerifier: verifier,
        autoDataHash: dataHash ?? undefined,
        autoVerifiedAt: verifiedAt,
        lastUpdatedEventId: event.eventId,
      },
    });
  }
}
