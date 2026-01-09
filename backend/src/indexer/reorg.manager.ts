/**
 * Reorg detection and rollback helper for the indexer.
 *
 * Ensures canonical history by marking orphaned logs/events and rewinding cursors.
 */
import { PrismaService } from "../prisma/prisma.service";
import { ChainClient } from "./chain.client";

export type ReorgResult = {
  reorged: boolean;
  rollbackFrom?: number;
};

/** Detects chain reorganizations and rewinds indexer state safely. */
export class ReorgManager {
  constructor(private readonly prisma: PrismaService, private readonly client: ChainClient) {}

  async detectAndHandle(chainId: number, cursor: { latestProcessedBlock: number; latestProcessedBlockHash?: string | null }, fallbackStart: number, finalityDepth: number): Promise<ReorgResult> {
    if (cursor.latestProcessedBlock <= fallbackStart || !cursor.latestProcessedBlockHash) {
      return { reorged: false };
    }
    const block = await this.client.getBlock(cursor.latestProcessedBlock);
    if (block.hash?.toLowerCase() === cursor.latestProcessedBlockHash.toLowerCase()) {
      return { reorged: false };
    }

    const rollbackFrom = Math.max(cursor.latestProcessedBlock - finalityDepth, fallbackStart);

    await this.prisma.chainLog.updateMany({
      where: { chainId, blockNumber: { gte: rollbackFrom } },
      data: { removed: true },
    });
    await this.prisma.decodedEvent.updateMany({
      where: { chainId, blockNumber: { gte: rollbackFrom } },
      data: { removed: true },
    });

    await this.prisma.chainCursor.update({
      where: { chainId },
      data: {
        latestProcessedBlock: Math.max(rollbackFrom - 1, fallbackStart - 1),
        latestProcessedBlockHash: null,
      },
    });

    return { reorged: true, rollbackFrom };
  }
}
