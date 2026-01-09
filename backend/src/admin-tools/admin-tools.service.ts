/**
 * Administrative repair and backfill operations.
 *
 * Exposes deterministic, idempotent workflows for recovery and backfills.
 */
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ChainActionsService } from "../chain-actions/chain-actions.service";
import { ChainActionStatus, ChainActionType, Prisma } from "@prisma/client";
import { ChainClient } from "../indexer/chain.client";
import { AnchoringQueueService } from "../anchoring/anchoring.queue.service";
import { AnchorKinds, AnchorKindLabels, AnchorKind, AnchorEntityType } from "../anchoring/anchoring.constants";
import { OrgRegistryService } from "../organizations/orgRegistry.service";
import { RpcUnavailableError } from "../chain/reliability/rpc.errors";
import { IndexerService } from "../indexer/indexer.service";
import { loadIndexerConfig } from "../indexer/indexer.config";
import { LegacyBadgeProjector } from "../indexer/projectors/badge.projector";
import { LegacyGoalProjector } from "../indexer/projectors/goal.projector";
import { Eip712Service } from "../validations/eip712.service";

type ReplayParams = {
  fromBlock: number;
  toBlock: number;
  chainId: number;
  types?: ChainActionType[];
};

function toNumberEnv(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

function normalizeAddress(value?: string | null) {
  if (!value) return null;
  const text = String(value || "").toLowerCase();
  return text.startsWith("0x") ? text : `0x${text}`;
}

@Injectable()
/** Provides deterministic admin repair and replay operations. */
export class AdminToolsService {
  private readonly indexerConfig = loadIndexerConfig();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ChainActionsService) private readonly chainActions: ChainActionsService,
    @Inject(AnchoringQueueService) private readonly anchoringQueue: AnchoringQueueService,
    @Inject(OrgRegistryService) private readonly orgRegistry: OrgRegistryService,
    @Inject(IndexerService) private readonly indexer: IndexerService,
    @Inject(Eip712Service) private readonly eip712: Eip712Service,
  ) {}

  private resolveRpcUrl() {
    return (
      process.env.CHAIN_ACTIONS_RPC_URL ||
      process.env.INDEXER_RPC_URL ||
      process.env.BASE_SEPOLIA_RPC_URL ||
      process.env.BASE_SEPOLIA_RPC ||
      process.env.RPC_URL ||
      "https://sepolia.base.org"
    );
  }

  private chainClient(chainId: number) {
    return new ChainClient({ chainId, rpcUrl: this.resolveRpcUrl() });
  }

  async retryChainAction(id: string, force: boolean, dryRun: boolean) {
    const receipt = await this.prisma.chainActionReceipt.findUnique({ where: { id } });
    if (!receipt) throw new NotFoundException("CHAIN_ACTION_NOT_FOUND");
    if (receipt.status === ChainActionStatus.FAILED && !force) {
      throw new BadRequestException("CHAIN_ACTION_FAILED_FORCE_REQUIRED");
    }
    if (dryRun) {
      return {
        dryRun: true,
        id,
        currentStatus: receipt.status,
        nextStatus: ChainActionStatus.PENDING,
        attempts: receipt.attempts + 1,
      };
    }
    const updated = await this.prisma.chainActionReceipt.update({
      where: { id },
      data: {
        status: ChainActionStatus.PENDING,
        attempts: { increment: 1 },
        finalizedAt: null,
        errorCode: null,
        errorMessage: null,
        observedAt: new Date(),
      },
    });
    return { dryRun: false, data: updated };
  }

  async replayChainActions(params: ReplayParams, dryRun: boolean) {
    if (!Number.isFinite(params.fromBlock) || !Number.isFinite(params.toBlock) || !Number.isFinite(params.chainId)) {
      throw new BadRequestException("INVALID_RANGE");
    }
    if (params.fromBlock > params.toBlock) throw new BadRequestException("INVALID_RANGE");
    const receipts = await this.prisma.chainActionReceipt.findMany({
      where: {
        chainId: params.chainId,
        blockNumber: { gte: params.fromBlock, lte: params.toBlock },
        type: params.types && params.types.length ? { in: params.types } : undefined,
      },
    });
    if (dryRun) {
      return { dryRun: true, count: receipts.length };
    }

    const client = this.chainClient(params.chainId);
    let updated = 0;
    let dropped = 0;
    let failed = 0;
    let unknown = 0;

    for (const receipt of receipts) {
      try {
        const txReceipt = await client.getTransactionReceipt(receipt.txHash as `0x${string}`);
        if (txReceipt.status !== "success") {
          await this.chainActions.markFailed(receipt.id, "TX_REVERTED", "Transaction reverted");
          failed += 1;
          continue;
        }
        await this.chainActions.recordObservedReceipt(
          receipt.type,
          receipt.chainId,
          receipt.txHash,
          txReceipt as any,
          null,
          { replayedAt: new Date().toISOString() },
        );
        updated += 1;
      } catch (error: any) {
        const name = error?.name || "";
        if (error instanceof RpcUnavailableError) {
          unknown += 1;
          continue;
        }
        if (name === "TransactionReceiptNotFoundError") {
          await this.chainActions.markDroppedReorg(receipt.id, "RECEIPT_NOT_FOUND");
          dropped += 1;
          continue;
        }
        unknown += 1;
      }
    }

    return { dryRun: false, count: receipts.length, updated, failed, dropped, unknown };
  }

  async backfillIndexer(params: { fromBlock: number; toBlock: number; chainId: number; force?: boolean }, dryRun: boolean) {
    if (!Number.isFinite(params.fromBlock) || !Number.isFinite(params.toBlock) || !Number.isFinite(params.chainId)) {
      throw new BadRequestException("INVALID_RANGE");
    }
    if (params.fromBlock > params.toBlock) throw new BadRequestException("INVALID_RANGE");
    if (params.chainId !== this.indexerConfig.chainId) {
      throw new BadRequestException("CHAIN_ID_MISMATCH");
    }
    const maxRange = toNumberEnv("ADMIN_INDEXER_MAX_RANGE", 20000);
    const rangeSize = params.toBlock - params.fromBlock + 1;
    if (rangeSize > maxRange && !params.force) {
      throw new BadRequestException("RANGE_TOO_LARGE");
    }
    if (dryRun) {
      return { dryRun: true, rangeSize };
    }
    const result = await this.indexer.ingestRange({ fromBlock: params.fromBlock, toBlock: params.toBlock });
    return { dryRun: false, ...result };
  }

  async rebuildProjections(
    params: { fromBlock: number; toBlock: number; chainId: number; projectorKeys?: string[]; force?: boolean },
    dryRun: boolean,
  ) {
    if (!Number.isFinite(params.fromBlock) || !Number.isFinite(params.toBlock) || !Number.isFinite(params.chainId)) {
      throw new BadRequestException("INVALID_RANGE");
    }
    if (params.fromBlock > params.toBlock) throw new BadRequestException("INVALID_RANGE");
    const keys = params.projectorKeys && params.projectorKeys.length
      ? params.projectorKeys
      : ["legacy_badges_v1", "legacy_goals_v1"];

    const runPayload = {
      chainId: params.chainId,
      fromBlock: params.fromBlock,
      toBlock: params.toBlock,
      projectorKeys: keys,
    };

    if (dryRun) {
      return { dryRun: true, ...runPayload };
    }

    const run = await this.prisma.projectionRebuildRun.create({
      data: {
        chainId: params.chainId,
        fromBlock: params.fromBlock,
        toBlock: params.toBlock,
        projectorKeys: keys,
        status: "RUNNING",
      },
    });

    const stats: Record<string, any> = { projectorKeys: keys, partial: false };
    const startBlock = this.indexerConfig.startBlock;
    if (params.fromBlock > startBlock && !params.force) {
      await this.prisma.projectionRebuildRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          stats: { error: "RANGE_REQUIRES_FORCE", ...stats },
        },
      });
      throw new BadRequestException("RANGE_REQUIRES_FORCE");
    }

    if (params.fromBlock > startBlock) {
      stats.partial = true;
    } else {
      await this.clearProjectionTables(params.chainId, keys);
    }

    try {
      const batchSize = toNumberEnv("ADMIN_REBUILD_BATCH_SIZE", 2000);
      const chain = new ChainClient({ chainId: params.chainId, rpcUrl: this.resolveRpcUrl() });

      const projectorMap: Record<string, { contractKey: string; kind: "badge" | "goal" }> = {
        legacy_badges_v1: { contractKey: "badge_v1", kind: "badge" },
        legacy_goals_v1: { contractKey: "core_v1", kind: "goal" },
      };
      let totalEvents = 0;
      for (const key of keys) {
        const entry = projectorMap[key];
        if (!entry) continue;
        for (let start = params.fromBlock; start <= params.toBlock; start += batchSize) {
          const end = Math.min(params.toBlock, start + batchSize - 1);
          const events = await this.prisma.decodedEvent.findMany({
            where: {
              chainId: params.chainId,
              contractKey: entry.contractKey,
              removed: false,
              blockNumber: { gte: start, lte: end },
            },
            orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
          });
          if (events.length) {
            await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
              const projector =
                entry.kind === "badge"
                  ? new LegacyBadgeProjector(tx as any)
                  : new LegacyGoalProjector(tx as any, chain);
              await projector.process(events as any);
            });
            totalEvents += events.length;
          }
        }
        await this.prisma.projectionCursor.upsert({
          where: { chainId_projectorKey: { chainId: params.chainId, projectorKey: key } },
          update: { lastProcessedBlock: params.toBlock },
          create: {
            chainId: params.chainId,
            projectorKey: key,
            lastProcessedBlock: params.toBlock,
          },
        });
      }
      stats.totalEvents = totalEvents;
      await this.prisma.projectionRebuildRun.update({
        where: { id: run.id },
        data: { status: "COMPLETED", finishedAt: new Date(), stats },
      });
      return { dryRun: false, runId: run.id, stats };
    } catch (error: any) {
      await this.prisma.projectionRebuildRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          finishedAt: new Date(),
          stats: { error: error?.message || "REBUILD_FAILED", ...stats },
        },
      });
      throw error;
    }
  }

  private async clearProjectionTables(chainId: number, projectorKeys: string[]) {
    if (projectorKeys.includes("legacy_badges_v1")) {
      await this.prisma.legacyBadgeOwnership.deleteMany({ where: { chainId } });
      await this.prisma.legacyOwnerBadgeToken.deleteMany({ where: { chainId } });
    }
    if (projectorKeys.includes("legacy_goals_v1")) {
      await this.prisma.legacyGoalEvidence.deleteMany({ where: { chainId } });
      await this.prisma.legacyGoalApproval.deleteMany({ where: { chainId } });
      await this.prisma.legacyGoal.deleteMany({ where: { chainId } });
    }
    await this.prisma.projectionCursor.deleteMany({
      where: { chainId, projectorKey: { in: projectorKeys } },
    });
  }

  async reverifyOrgTx(orgId: string, dryRun: boolean) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException("ORG_NOT_FOUND");
    const txHash = org.onchainCreationTxHash || org.creationTxHash;
    if (!txHash) throw new BadRequestException("ORG_TX_NOT_SET");

    let creator = normalizeAddress(org.onchainCreator);
    if (!creator) {
      const user = await this.prisma.user.findUnique({
        where: { userId: org.createdByUserId },
        select: { primaryWallet: true },
      });
      creator = normalizeAddress(user?.primaryWallet || null);
    }
    if (!creator) throw new BadRequestException("ORG_CREATOR_NOT_SET");

    if (dryRun) {
      return {
        dryRun: true,
        orgId,
        txHash,
      };
    }

    try {
      const chainInfo = await this.orgRegistry.verifyCreateOrgTx({
        txHash,
        handle: org.handle,
        creator,
      });
      await this.prisma.organization.update({
        where: { id: orgId },
        data: {
          onchainStatus: "PENDING_CONFIRMATIONS",
          onchainChainId: chainInfo.chainId,
          onchainCreationTxHash: chainInfo.txHash,
          onchainHandleHash: chainInfo.handleHash,
          onchainCreator: chainInfo.creator,
          onchainCreatedAt: chainInfo.createdAt ? new Date(chainInfo.createdAt * 1000) : null,
          onchainBlockNumber: chainInfo.blockNumber ?? null,
          onchainBlockHash: chainInfo.blockHash ?? null,
        },
      });

      await this.chainActions.recordObservedReceipt(
        ChainActionType.ORG_CREATE,
        chainInfo.chainId,
        chainInfo.txHash,
        {
          status: "success",
          blockNumber: chainInfo.blockNumber ?? null,
          blockHash: chainInfo.blockHash ?? null,
          from: chainInfo.fromAddress ?? null,
          to: chainInfo.toAddress ?? null,
        },
        {
          eventName: "OrgCreated",
          logIndex: chainInfo.logIndex ?? null,
          args: {
            handle: org.handle,
            handleHash: chainInfo.handleHash,
            creator: chainInfo.creator,
            feePaid: chainInfo.feePaid,
          },
        },
        { orgId },
      );

      return { dryRun: false, status: "PENDING_CONFIRMATIONS", chainInfo };
    } catch (error) {
      if (error instanceof RpcUnavailableError) {
        return { dryRun: false, status: "UNKNOWN" };
      }
      await this.prisma.organization.update({
        where: { id: orgId },
        data: { onchainStatus: "DROPPED_REORG" },
      });
      await this.prisma.operationalAlert.create({
        data: {
          severity: "WARN",
          type: "REORG_SPIKE",
          message: `Org creation tx invalid or missing: ${orgId}`,
          details: { orgId, txHash },
        },
      });
      return { dryRun: false, status: "DROPPED_REORG" };
    }
  }

  async retryAnchor(entityType: string, entityId: string, dryRun: boolean) {
    const rawType = String(entityType || "").toUpperCase();
    if (!["PROOF", "VALIDATION", "EXPORT", "SUBMISSION"].includes(rawType)) {
      throw new BadRequestException("INVALID_ANCHOR_ENTITY");
    }
    const type = rawType as AnchorEntityType;

    let hash: string | null = null;
    let kind: AnchorKind = AnchorKinds.PROOF;
    if (type === "PROOF") {
      const proof = await this.prisma.proofArtifact.findUnique({ where: { id: entityId } });
      if (!proof) throw new NotFoundException("PROOF_NOT_FOUND");
      hash = proof.sha256;
      kind = AnchorKinds.PROOF;
    } else if (type === "VALIDATION") {
      const validation = await this.prisma.validationAttestation.findUnique({ where: { id: entityId } });
      if (!validation) throw new NotFoundException("VALIDATION_NOT_FOUND");
      hash = validation.attestationHash || this.eip712.hashTypedData(validation.typedData as any);
      kind = AnchorKinds.VALIDATION;
    } else if (type === "EXPORT") {
      const exportRecord = await this.prisma.profileExport.findUnique({ where: { id: entityId } });
      if (!exportRecord) throw new NotFoundException("EXPORT_NOT_FOUND");
      hash = exportRecord.snapshotHash;
      kind = AnchorKinds.EXPORT;
    } else if (type === "SUBMISSION") {
      const submission = await this.prisma.milestoneSubmission.findUnique({ where: { id: entityId } });
      if (!submission) throw new NotFoundException("SUBMISSION_NOT_FOUND");
      hash = submission.submissionHash || null;
      kind = AnchorKinds.SUBMISSION;
    }

    if (!hash) throw new BadRequestException("ANCHOR_HASH_NOT_AVAILABLE");

    if (dryRun) {
      return {
        dryRun: true,
        entityType: type,
        entityId,
        hash,
        kind: AnchorKindLabels[kind],
      };
    }

    const result = await this.anchoringQueue.enqueue({
      kind: kind as any,
      hash,
      entityType: type as any,
      entityId,
    });
    return { dryRun: false, result };
  }
}
