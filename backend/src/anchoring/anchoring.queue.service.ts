/**
 * Anchoring queue worker.
 *
 * Processes anchor jobs with retries, records ChainActionReceipt entries, and is safe to re-run idempotently.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { AnchorJob, AnchorJobStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AnchoringService } from "./anchoring.service";
import { AnchorKind, AnchorKindLabels, AnchorEntityType, AnchorKinds } from "./anchoring.constants";
import { ChainActionsService } from "../chain-actions/chain-actions.service";
import { ChainActionType } from "@prisma/client";
import { MetricsService } from "../metrics/metrics.service";
import { isRpcUnavailableError } from "../chain/reliability/rpc.errors";

type AnchorUpdate = {
  anchorTxHash?: string | null;
  anchorContract?: string | null;
  anchoredAt?: Date | null;
  chainId?: number | null;
  blockNumber?: number | null;
  blockHash?: string | null;
  fromAddress?: string | null;
  toAddress?: string | null;
  receiptStatus?: string | null;
};

@Injectable()
/** Processes anchor jobs with retries and idempotent state updates. */
export class AnchoringQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnchoringQueueService.name);
  private timer: NodeJS.Timeout | null = null;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly anchoring: AnchoringService,
    private readonly metrics: MetricsService,
    private readonly chainActions: ChainActionsService,
  ) {}

  onModuleInit() {
    if (!this.anchoring.isQueueEnabled()) return;
    this.timer = setInterval(() => {
      void this.processQueue();
    }, 15000);
    void this.processQueue();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async enqueue(params: { kind: AnchorKind; hash: string; entityType: AnchorEntityType; entityId: string }) {
    if (!this.anchoring.isEnabled()) return { status: "disabled" as const };
    let normalized: `0x${string}`;
    try {
      normalized = this.anchoring.normalizeHash(params.hash);
    } catch (error) {
      this.logger.warn(`Invalid anchor hash for ${params.entityType}:${params.entityId}`);
      return { status: "invalid" as const };
    }

    const existingDone = await this.prisma.anchorJob.findFirst({
      where: { kind: params.kind, hash: normalized, status: AnchorJobStatus.DONE },
      orderBy: { updatedAt: "desc" },
    });
    if (existingDone) {
      await this.applyAnchorToEntity(params.entityType, params.entityId, existingDone);
      return { status: "completed" as const };
    }

    try {
      await this.prisma.anchorJob.create({
        data: {
          kind: params.kind,
          hash: normalized,
          entityType: params.entityType,
          entityId: params.entityId,
          status: AnchorJobStatus.PENDING,
          nextRunAt: new Date(),
        },
      });
      return { status: "queued" as const };
    } catch (error: any) {
      if (error?.code === "P2002") {
        const existing = await this.prisma.anchorJob.findFirst({
          where: { entityType: params.entityType, entityId: params.entityId, kind: params.kind, hash: normalized },
        });
        if (existing?.status === AnchorJobStatus.DONE) {
          await this.applyAnchorToEntity(params.entityType, params.entityId, existing);
        }
        return { status: "queued" as const };
      }
      throw error;
    }
  }

  private async applyAnchorToEntity(entityType: AnchorEntityType, entityId: string, update: AnchorUpdate) {
    const payload: Record<string, any> = {};
    if (update.anchorTxHash !== undefined) payload.anchorTxHash = update.anchorTxHash;
    if (update.anchorContract) payload.anchorContract = update.anchorContract;
    if (update.anchoredAt) payload.anchoredAt = update.anchoredAt;
    if (update.chainId && entityType !== "VALIDATION") payload.chainId = update.chainId;
    if (!Object.keys(payload).length) return;

    switch (entityType) {
      case "PROOF":
        await this.prisma.proofArtifact.update({ where: { id: entityId }, data: payload });
        return;
      case "EXPORT":
        await this.prisma.profileExport.update({ where: { id: entityId }, data: payload });
        return;
      case "SUBMISSION":
        await this.prisma.milestoneSubmission.update({ where: { id: entityId }, data: payload });
        return;
      case "VALIDATION":
        await this.prisma.validationAttestation.update({ where: { id: entityId }, data: payload });
        return;
      default:
        return;
    }
  }

  private async loadPendingJobs() {
    const take = Math.max(this.anchoring.getBatchSize() * 4, 20);
    return this.prisma.anchorJob.findMany({
      where: {
        status: AnchorJobStatus.PENDING,
        nextRunAt: { lte: new Date() },
      },
      orderBy: { createdAt: "asc" },
      take,
    });
  }

  async processQueue() {
    if (this.processing || !this.anchoring.isEnabled()) return;
    this.processing = true;
    try {
      const jobs = await this.loadPendingJobs();
      if (!jobs.length) return;
      const ids = jobs.map((job: AnchorJob) => job.id);
      await this.prisma.anchorJob.updateMany({
        where: { id: { in: ids }, status: AnchorJobStatus.PENDING },
        data: { status: AnchorJobStatus.PROCESSING },
      });

      const grouped = new Map<number, AnchorJob[]>();
      for (const job of jobs) {
        const list = grouped.get(job.kind) || [];
        list.push(job);
        grouped.set(job.kind, list);
      }

      for (const [kind, kindJobs] of grouped.entries()) {
        await this.processKindJobs(kind, kindJobs);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processKindJobs(kind: number, jobs: AnchorJob[]) {
    const jobsByHash = new Map<string, AnchorJob[]>();
    for (const job of jobs) {
      const key = job.hash.toLowerCase();
      const list = jobsByHash.get(key) || [];
      list.push(job);
      jobsByHash.set(key, list);
    }

    const hashes = Array.from(jobsByHash.keys());
    const batchSize = this.anchoring.getBatchSize();
    for (let i = 0; i < hashes.length; i += batchSize) {
      const batch = hashes.slice(i, i + batchSize);
      try {
        const result = await this.anchoring.anchorBatch({ hashHex32List: batch, kind });
        await this.markBatchDone(kind, batch, jobsByHash, {
          anchorTxHash: result.txHash,
          anchorContract: result.contract,
          anchoredAt: result.anchoredAt,
          chainId: result.chainId,
          blockNumber: result.blockNumber ?? null,
          blockHash: result.blockHash ?? null,
          fromAddress: result.fromAddress ?? null,
          toAddress: result.toAddress ?? null,
          receiptStatus: result.receiptStatus ?? null,
        });
      } catch (error) {
        await this.handleBatchFailure(batch, jobsByHash, error);
      }
    }
  }

  private async markBatchDone(kind: number, batch: string[], jobsByHash: Map<string, AnchorJob[]>, result: AnchorUpdate) {
    await this.recordAnchorAction(kind, batch, jobsByHash, result);
    for (const hash of batch) {
      const jobs = jobsByHash.get(hash) || [];
      await Promise.all(
        jobs.map(async (job) => {
          await this.applyAnchorToEntity(job.entityType as AnchorEntityType, job.entityId, result);
          await this.prisma.anchorJob.update({
            where: { id: job.id },
            data: {
              status: AnchorJobStatus.DONE,
              anchorTxHash: result.anchorTxHash ?? null,
              anchorContract: result.anchorContract ?? null,
              anchoredAt: result.anchoredAt ?? null,
              chainId: result.chainId ?? null,
              lastError: null,
            },
          });
          const label = AnchorKindLabels[job.kind as AnchorKind] || "UNKNOWN";
          this.metrics.recordAnchorJob(label, "done");
        }),
      );
    }
  }

  private mapKindToActionType(kind: number): ChainActionType {
    switch (kind) {
      case AnchorKinds.PROOF:
        return ChainActionType.ANCHOR_PROOF;
      case AnchorKinds.VALIDATION:
        return ChainActionType.ANCHOR_VALIDATION;
      case AnchorKinds.EXPORT:
        return ChainActionType.ANCHOR_EXPORT;
      case AnchorKinds.SUBMISSION:
        return ChainActionType.ANCHOR_SUBMISSION;
      default:
        return ChainActionType.OTHER;
    }
  }

  private async recordAnchorAction(
    kind: number,
    batch: string[],
    jobsByHash: Map<string, AnchorJob[]>,
    result: AnchorUpdate,
  ) {
    if (!this.chainActions.isEnabled()) return;
    const txHash = result.anchorTxHash;
    if (!txHash || !result.chainId) return;

    const entityIds: string[] = [];
    for (const hash of batch) {
      const jobs = jobsByHash.get(hash) || [];
      for (const job of jobs) {
        entityIds.push(job.entityId);
      }
    }
    const uniqueEntityIds = Array.from(new Set(entityIds));

    await this.chainActions.recordObservedReceipt(
      this.mapKindToActionType(kind),
      result.chainId,
      txHash,
      {
        status: result.receiptStatus || "success",
        blockNumber: result.blockNumber ?? null,
        blockHash: result.blockHash ?? null,
        from: result.fromAddress ?? null,
        to: result.toAddress ?? null,
      },
      {
        eventName: "Anchored",
        logIndex: null,
        args: {
          kind,
          hashes: batch,
        },
      },
      {
        entityType: AnchorKindLabels[kind as AnchorKind] || "UNKNOWN",
        entityIds: uniqueEntityIds,
        hashCount: batch.length,
      },
    );
    this.logger.log(
      JSON.stringify({
        message: "anchor_batch_sent",
        chainId: result.chainId,
        txHash,
        kind: AnchorKindLabels[kind as AnchorKind] || "UNKNOWN",
        entityCount: uniqueEntityIds.length,
      }),
    );
  }

  private async handleBatchFailure(batch: string[], jobsByHash: Map<string, AnchorJob[]>, error: any) {
    const errorMessage = error?.shortMessage || error?.message || "ANCHOR_BATCH_FAILED";
    const rpcUnavailable = isRpcUnavailableError(error);
    for (const hash of batch) {
      const jobs = jobsByHash.get(hash) || [];
      let anchored = false;
      let failureReason = errorMessage;
      if (rpcUnavailable) {
        await Promise.all(
          jobs.map(async (job) => {
            await this.deferJob(job, "RPC_UNAVAILABLE");
          }),
        );
        continue;
      }
      try {
        const verify = await this.anchoring.verifyAnchored({ hashHex32: hash });
        const expectedKind = jobs[0]?.kind;
        const kindMatches = verify.anchorPresent && Number(verify.kind || 0) === Number(expectedKind || 0);
        if (kindMatches) {
          anchored = true;
          const anchoredAt = verify.timestamp ? new Date(verify.timestamp * 1000) : new Date();
          const update: AnchorUpdate = {
            anchorContract: verify.contract || null,
            anchoredAt,
            chainId: verify.chainId ?? null,
            anchorTxHash: null,
          };
          for (const job of jobs) {
            await this.applyAnchorToEntity(job.entityType as AnchorEntityType, job.entityId, update);
            await this.prisma.anchorJob.update({
              where: { id: job.id },
              data: {
                status: AnchorJobStatus.DONE,
                anchorContract: update.anchorContract,
                anchoredAt: update.anchoredAt,
                chainId: update.chainId,
                anchorTxHash: null,
                lastError: null,
              },
            });
            const label = AnchorKindLabels[job.kind as AnchorKind] || "UNKNOWN";
            this.metrics.recordAnchorJob(label, "done");
          }
        } else if (verify.anchorPresent) {
          failureReason = "ANCHOR_KIND_MISMATCH";
        }
      } catch {
        anchored = false;
      }
      if (!anchored) {
        await Promise.all(
          jobs.map(async (job) => {
            await this.markJobFailed(job, failureReason);
          }),
        );
      }
    }
  }

  private async deferJob(job: AnchorJob, reason: string) {
    const delayMs = 15000;
    const nextRunAt = new Date(Date.now() + delayMs);
    await this.prisma.anchorJob.update({
      where: { id: job.id },
      data: {
        status: AnchorJobStatus.PENDING,
        lastError: reason,
        nextRunAt,
      },
    });
  }

  private async markJobFailed(job: AnchorJob, errorMessage: string) {
    const attempts = job.attempts + 1;
    const maxAttempts = 5;
    const delayMs = Math.min(30000 * Math.pow(2, attempts - 1), 15 * 60 * 1000);
    const nextRunAt = new Date(Date.now() + delayMs);
    const status = attempts >= maxAttempts ? AnchorJobStatus.FAILED : AnchorJobStatus.PENDING;
    await this.prisma.anchorJob.update({
      where: { id: job.id },
      data: {
        status,
        attempts,
        lastError: errorMessage,
        nextRunAt: status === AnchorJobStatus.PENDING ? nextRunAt : job.nextRunAt,
      },
    });
    if (status === AnchorJobStatus.FAILED) {
      const label = AnchorKindLabels[job.kind as AnchorKind] || "UNKNOWN";
      this.logger.warn(`Anchor job failed (${label}) for ${job.entityType}:${job.entityId}`);
      this.metrics.recordAnchorJob(label, "failed");
    }
  }
}
