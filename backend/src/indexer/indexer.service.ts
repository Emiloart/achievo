/**
 * Reorg-safe indexer orchestrator.
 *
 * Coordinates log fetching, decoding, and projection updates with deterministic replays.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ChainClient } from "./chain.client";
import { LogFetcher } from "./log.fetcher";
import { LogDecoder } from "./log.decoder";
import { ReorgManager } from "./reorg.manager";
import { loadIndexerConfig } from "./indexer.config";
import { loadIndexerContracts } from "./indexer.contracts";
import { LegacyBadgeProjector } from "./projectors/badge.projector";
import { LegacyGoalProjector } from "./projectors/goal.projector";
import { UsernameOwnershipProjector } from "./projectors/username.projector";
import type { DecodedEventRow } from "./projectors/projector.types";

const SYNC_INTERVAL_MS = 15000;

@Injectable()
/** Coordinates reorg-safe indexing and projection updates. */
export class IndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndexerService.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  private readonly config = loadIndexerConfig();
  private readonly client = new ChainClient({
    chainId: this.config.chainId,
    rpcUrl: this.config.rpcUrl,
  });
  private readonly fetcher = new LogFetcher(this.client);
  private readonly contracts = loadIndexerContracts();
  private readonly decoder = new LogDecoder(this.contracts);
  private readonly reorgManager = new ReorgManager(this.prisma, this.client);
  private readonly badgeProjector = new LegacyBadgeProjector(this.prisma);
  private readonly goalProjector = new LegacyGoalProjector(this.prisma, this.client);
  private readonly usernameProjector = new UsernameOwnershipProjector(this.prisma);

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    if (!this.config.enabled) return;
    if (!this.contracts.length) {
      this.logger.warn("Indexer enabled but no contract addresses configured.");
      return;
    }
    this.timer = setInterval(() => {
      void this.sync().catch((error) => this.logger.error(error));
    }, SYNC_INTERVAL_MS);
    void this.sync().catch((error) => this.logger.error(error));
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sync() {
    if (this.running) return;
    this.running = true;
    try {
      const head = await this.client.getBlockNumber();
      const finalized = Math.max(head - this.config.finalityDepth, this.config.startBlock);
      const cursor = await this.ensureCursor();

      const reorg = await this.reorgManager.detectAndHandle(
        this.config.chainId,
        cursor,
        this.config.startBlock,
        this.config.finalityDepth,
      );
      if (reorg.reorged) {
        await this.rebuildProjections();
      }

      const freshCursor = await this.ensureCursor();
      if (freshCursor.latestProcessedBlock >= finalized) {
        await this.updateFinalized(finalized);
        return;
      }

      const addresses = this.contracts.map((c) => c.address);
      for (
        let start = freshCursor.latestProcessedBlock + 1;
        start <= finalized;
        start += this.config.batchSize
      ) {
        const end = Math.min(finalized, start + this.config.batchSize - 1);
        const logs = await this.fetcher.fetchLogs({
          fromBlock: start,
          toBlock: end,
          addresses,
          batchSize: this.config.batchSize,
        });

        for (const log of logs) {
          const topics = log.topics || [];
          const entry = {
            chainId: this.config.chainId,
            blockNumber: Number(log.blockNumber),
            blockHash: log.blockHash?.toLowerCase() || "",
            txHash: log.transactionHash?.toLowerCase() || "",
            logIndex: Number(log.logIndex),
            address: log.address.toLowerCase(),
            topic0: topics[0] || "0x",
            topic1: topics[1] || null,
            topic2: topics[2] || null,
            topic3: topics[3] || null,
            data: log.data || "0x",
            removed: false,
          };

          await this.prisma.chainLog.upsert({
            where: {
              chainId_txHash_logIndex: {
                chainId: entry.chainId,
                txHash: entry.txHash,
                logIndex: entry.logIndex,
              },
            },
            update: {
              blockNumber: entry.blockNumber,
              blockHash: entry.blockHash,
              address: entry.address,
              topic0: entry.topic0,
              topic1: entry.topic1,
              topic2: entry.topic2,
              topic3: entry.topic3,
              data: entry.data,
              removed: false,
            },
            create: {
              ...entry,
            },
          });

          const decoded = this.decoder.decode({
            address: entry.address,
            data: entry.data as `0x${string}`,
            topics: topics as `0x${string}`[],
          });
          if (!decoded) continue;

          const eventId = `${this.config.chainId}:${entry.txHash}:${entry.logIndex}`;
          await this.prisma.decodedEvent.upsert({
            where: { eventId },
            update: {
              contractKey: decoded.contractKey,
              contractAddress: entry.address,
              eventName: decoded.eventName,
              blockNumber: entry.blockNumber,
              txHash: entry.txHash,
              logIndex: entry.logIndex,
              args: decoded.args as any,
              removed: false,
            },
            create: {
              chainId: this.config.chainId,
              contractKey: decoded.contractKey,
              contractAddress: entry.address,
              eventName: decoded.eventName,
              blockNumber: entry.blockNumber,
              txHash: entry.txHash,
              logIndex: entry.logIndex,
              args: decoded.args as any,
              eventId,
              removed: false,
            },
          });
        }

        const block = await this.client.getBlock(end);
        await this.prisma.chainCursor.update({
          where: { chainId: this.config.chainId },
          data: {
            latestProcessedBlock: end,
            latestProcessedBlockHash: block.hash?.toLowerCase() || null,
            latestFinalizedBlock: finalized,
          },
        });
      }

      await this.applyProjectors(finalized);
    } finally {
      this.running = false;
    }
  }

  async ingestRange(params: { fromBlock: number; toBlock: number }) {
    if (params.fromBlock > params.toBlock) return { logs: 0, events: 0 };
    const addresses = this.contracts.map((c) => c.address);
    let logCount = 0;
    let eventCount = 0;

    for (let start = params.fromBlock; start <= params.toBlock; start += this.config.batchSize) {
      const end = Math.min(params.toBlock, start + this.config.batchSize - 1);
      const logs = await this.fetcher.fetchLogs({
        fromBlock: start,
        toBlock: end,
        addresses,
        batchSize: this.config.batchSize,
      });

      for (const log of logs) {
        const topics = log.topics || [];
        const entry = {
          chainId: this.config.chainId,
          blockNumber: Number(log.blockNumber),
          blockHash: log.blockHash?.toLowerCase() || "",
          txHash: log.transactionHash?.toLowerCase() || "",
          logIndex: Number(log.logIndex),
          address: log.address.toLowerCase(),
          topic0: topics[0] || "0x",
          topic1: topics[1] || null,
          topic2: topics[2] || null,
          topic3: topics[3] || null,
          data: log.data || "0x",
          removed: false,
        };

        await this.prisma.chainLog.upsert({
          where: {
            chainId_txHash_logIndex: {
              chainId: entry.chainId,
              txHash: entry.txHash,
              logIndex: entry.logIndex,
            },
          },
          update: {
            blockNumber: entry.blockNumber,
            blockHash: entry.blockHash,
            address: entry.address,
            topic0: entry.topic0,
            topic1: entry.topic1,
            topic2: entry.topic2,
            topic3: entry.topic3,
            data: entry.data,
            removed: false,
          },
          create: {
            ...entry,
          },
        });
        logCount += 1;

        const decoded = this.decoder.decode({
          address: entry.address,
          data: entry.data as `0x${string}`,
          topics: topics as `0x${string}`[],
        });
        if (!decoded) continue;

        const eventId = `${this.config.chainId}:${entry.txHash}:${entry.logIndex}`;
        await this.prisma.decodedEvent.upsert({
          where: { eventId },
          update: {
            contractKey: decoded.contractKey,
            contractAddress: entry.address,
            eventName: decoded.eventName,
            blockNumber: entry.blockNumber,
            txHash: entry.txHash,
            logIndex: entry.logIndex,
            args: decoded.args as any,
            removed: false,
          },
          create: {
            chainId: this.config.chainId,
            contractKey: decoded.contractKey,
            contractAddress: entry.address,
            eventName: decoded.eventName,
            blockNumber: entry.blockNumber,
            txHash: entry.txHash,
            logIndex: entry.logIndex,
            args: decoded.args as any,
            eventId,
            removed: false,
          },
        });
        eventCount += 1;
      }
    }

    return { logs: logCount, events: eventCount };
  }

  private async ensureCursor() {
    const existing = await this.prisma.chainCursor.findUnique({ where: { chainId: this.config.chainId } });
    if (existing) return existing;
    return this.prisma.chainCursor.create({
      data: {
        chainId: this.config.chainId,
        latestProcessedBlock: this.config.startBlock - 1,
        latestFinalizedBlock: this.config.startBlock - 1,
      },
    });
  }

  private async updateFinalized(finalized: number) {
    await this.prisma.chainCursor.update({
      where: { chainId: this.config.chainId },
      data: { latestFinalizedBlock: finalized },
    });
  }

  private async applyProjectors(finalized: number) {
    await this.applyProjector("legacy_badges_v1", "badge_v1", finalized, this.badgeProjector);
    await this.applyProjector("legacy_goals_v1", "core_v1", finalized, this.goalProjector);
    await this.applyProjector("username_ownership_v1", "username_registry", finalized, this.usernameProjector);
  }

  private async applyProjector(
    projectorKey: string,
    contractKey: string,
    finalized: number,
    projector: { process: (events: DecodedEventRow[]) => Promise<void> },
  ) {
    const cursor = await this.prisma.projectionCursor.findUnique({
      where: { chainId_projectorKey: { chainId: this.config.chainId, projectorKey } },
    });
    const fromBlock = cursor ? cursor.lastProcessedBlock + 1 : this.config.startBlock;
    if (fromBlock > finalized) return;

    const events = await this.prisma.decodedEvent.findMany({
      where: {
        chainId: this.config.chainId,
        contractKey,
        removed: false,
        blockNumber: { gte: fromBlock, lte: finalized },
      },
      orderBy: [{ blockNumber: "asc" }, { logIndex: "asc" }],
    });

    if (events.length) {
      await projector.process(events as unknown as DecodedEventRow[]);
    }

    if (cursor) {
      await this.prisma.projectionCursor.update({
        where: { chainId_projectorKey: { chainId: this.config.chainId, projectorKey } },
        data: { lastProcessedBlock: finalized },
      });
    } else {
      await this.prisma.projectionCursor.create({
        data: {
          chainId: this.config.chainId,
          projectorKey,
          lastProcessedBlock: finalized,
        },
      });
    }
  }

  private async rebuildProjections() {
    const chainId = this.config.chainId;
    await this.prisma.legacyBadgeOwnership.deleteMany({ where: { chainId } });
    await this.prisma.legacyOwnerBadgeToken.deleteMany({ where: { chainId } });
    await this.prisma.legacyGoalEvidence.deleteMany({ where: { chainId } });
    await this.prisma.legacyGoalApproval.deleteMany({ where: { chainId } });
    await this.prisma.legacyGoal.deleteMany({ where: { chainId } });
    await this.prisma.usernameOwnership.deleteMany({ where: { chainId } });
    await this.prisma.projectionCursor.deleteMany({ where: { chainId } });
  }
}
