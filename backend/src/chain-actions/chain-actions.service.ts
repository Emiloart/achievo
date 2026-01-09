/**
 * Chain action receipt service.
 *
 * Records on-chain actions and enforces idempotent status transitions with finality awareness.
 */
import { Injectable, Logger } from "@nestjs/common";
import { Prisma, ChainActionStatus, ChainActionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type ReceiptLike = {
  status?: string | number | bigint | null;
  blockNumber?: number | bigint | null;
  blockHash?: string | null;
  from?: string | null;
  to?: string | null;
};

type DecodedEventSummary = {
  eventName?: string | null;
  logIndex?: number | null;
  args?: Record<string, any> | null;
};

type ChainActionMetadata = Record<string, any>;

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function normalizeHash(raw?: string | null) {
  if (!raw) return null;
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  return value.toLowerCase();
}

function normalizeAddress(raw?: string | null) {
  if (!raw) return null;
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  return value.toLowerCase();
}

function parseReceiptStatus(status?: string | number | bigint | null) {
  if (status === "success" || status === 1 || status === 1n) return "success";
  if (status === "reverted" || status === 0 || status === 0n) return "reverted";
  return "unknown";
}

function mergeMetadata(existing: any, incoming?: ChainActionMetadata | null) {
  if (!incoming) return existing ?? null;
  if (existing && typeof existing === "object" && typeof incoming === "object" && !Array.isArray(incoming)) {
    return { ...(existing as Record<string, any>), ...(incoming as Record<string, any>) };
  }
  return incoming;
}

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

@Injectable()
/** Records chain action receipts and drives status transitions. */
export class ChainActionsService {
  private readonly logger = new Logger(ChainActionsService.name);
  constructor(private readonly prisma: PrismaService) {}

  isEnabled() {
    return toBooleanEnv("CHAIN_ACTIONS_ENABLED", true);
  }

  getConfirmationsRequired() {
    const fallback = Number(process.env.INDEXER_FINALITY_DEPTH || 20);
    const raw = Number(process.env.CHAIN_CONFIRMATIONS_REQUIRED || fallback);
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : Math.max(1, fallback || 20);
  }

  private client(tx?: PrismaClientLike) {
    return tx || this.prisma;
  }

  async recordPending(
    type: ChainActionType,
    chainId: number,
    txHash: string,
    fromAddress?: string | null,
    toAddress?: string | null,
    metadata?: ChainActionMetadata | null,
    tx?: PrismaClientLike,
  ) {
    if (!this.isEnabled()) return null;
    const normalizedHash = normalizeHash(txHash);
    if (!normalizedHash) return null;
    const client = this.client(tx);
    const existing = await client.chainActionReceipt.findUnique({
      where: { chainId_type_txHash: { chainId, type, txHash: normalizedHash } },
    });
    if (existing) {
      if (existing.status === ChainActionStatus.FAILED) return existing;
      return client.chainActionReceipt.update({
        where: { id: existing.id },
        data: {
          fromAddress: normalizeAddress(fromAddress) || existing.fromAddress,
          toAddress: normalizeAddress(toAddress) || existing.toAddress,
          metadata: mergeMetadata(existing.metadata, metadata),
        },
      });
    }
    const created = await client.chainActionReceipt.create({
      data: {
        chainId,
        type,
        txHash: normalizedHash,
        status: ChainActionStatus.PENDING,
        fromAddress: normalizeAddress(fromAddress),
        toAddress: normalizeAddress(toAddress),
        observedAt: new Date(),
        confirmationsRequired: this.getConfirmationsRequired(),
        metadata: metadata || undefined,
      },
    });
    this.logger.log(
      JSON.stringify({
        message: "chain_action_pending",
        chainId,
        type,
        txHash: normalizedHash,
        metadata: metadata || undefined,
      }),
    );
    return created;
  }

  async recordObservedReceipt(
    type: ChainActionType,
    chainId: number,
    txHash: string,
    receipt?: ReceiptLike | null,
    decodedEvent?: DecodedEventSummary | null,
    metadata?: ChainActionMetadata | null,
    tx?: PrismaClientLike,
  ) {
    if (!this.isEnabled()) return null;
    const normalizedHash = normalizeHash(txHash);
    if (!normalizedHash) return null;
    const client = this.client(tx);
    const existing = await client.chainActionReceipt.findUnique({
      where: { chainId_type_txHash: { chainId, type, txHash: normalizedHash } },
    });

    const status = parseReceiptStatus(receipt?.status);
    const blockNumber =
      typeof receipt?.blockNumber === "bigint" ? Number(receipt.blockNumber) : receipt?.blockNumber ?? null;
    const blockHash = normalizeHash(receipt?.blockHash || null);
    const fromAddress = normalizeAddress(receipt?.from || null);
    const toAddress = normalizeAddress(receipt?.to || null);
    const eventMeta = decodedEvent
      ? {
          eventName: decodedEvent.eventName,
          logIndex: decodedEvent.logIndex ?? null,
          args: decodedEvent.args ?? null,
        }
      : null;
    const mergedMetadata = mergeMetadata(existing?.metadata, mergeMetadata(eventMeta, metadata));

    let nextStatus = existing?.status || ChainActionStatus.PENDING;
    if (status === "reverted") {
      nextStatus = ChainActionStatus.FAILED;
    } else if (status === "success") {
      if (existing?.status !== ChainActionStatus.CONFIRMED && existing?.status !== ChainActionStatus.FAILED) {
        nextStatus = ChainActionStatus.PENDING;
      }
    }

    if (existing) {
      if (existing.status === ChainActionStatus.FAILED && nextStatus !== ChainActionStatus.FAILED) {
        return existing;
      }
      const updated = await client.chainActionReceipt.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          fromAddress: fromAddress || existing.fromAddress,
          toAddress: toAddress || existing.toAddress,
          blockNumber: blockNumber ?? existing.blockNumber,
          blockHash: blockHash || existing.blockHash,
          logIndex: decodedEvent?.logIndex ?? existing.logIndex,
          errorCode: status === "reverted" ? "TX_REVERTED" : existing.errorCode,
          errorMessage: status === "reverted" ? "Transaction reverted" : existing.errorMessage,
          metadata: mergedMetadata,
        },
      });
      this.logger.log(
        JSON.stringify({
          message: "chain_action_observed",
          chainId,
          type,
          txHash: normalizedHash,
          status: updated.status,
        }),
      );
      return updated;
    }

    const created = await client.chainActionReceipt.create({
      data: {
        chainId,
        type,
        txHash: normalizedHash,
        status: nextStatus,
        fromAddress,
        toAddress,
        blockNumber: blockNumber ?? undefined,
        blockHash: blockHash || undefined,
        logIndex: decodedEvent?.logIndex ?? null,
        observedAt: new Date(),
        confirmationsRequired: this.getConfirmationsRequired(),
        errorCode: status === "reverted" ? "TX_REVERTED" : null,
        errorMessage: status === "reverted" ? "Transaction reverted" : null,
        metadata: mergedMetadata || undefined,
      },
    });
    this.logger.log(
      JSON.stringify({
        message: "chain_action_observed",
        chainId,
        type,
        txHash: normalizedHash,
        status: created.status,
      }),
    );
    return created;
  }

  async markConfirmed(id: string, finalizedAt?: Date | null) {
    if (!this.isEnabled()) return null;
    return this.prisma.chainActionReceipt.update({
      where: { id },
      data: {
        status: ChainActionStatus.CONFIRMED,
        finalizedAt: finalizedAt || new Date(),
        errorCode: null,
        errorMessage: null,
      },
    });
  }

  async markFailed(id: string, errorCode?: string | null, errorMessage?: string | null) {
    if (!this.isEnabled()) return null;
    return this.prisma.chainActionReceipt.update({
      where: { id },
      data: {
        status: ChainActionStatus.FAILED,
        errorCode: errorCode || "FAILED",
        errorMessage: errorMessage || null,
      },
    });
  }

  async markDroppedReorg(id: string, errorMessage?: string | null) {
    if (!this.isEnabled()) return null;
    return this.prisma.chainActionReceipt.update({
      where: { id },
      data: {
        status: ChainActionStatus.DROPPED_REORG,
        errorCode: "DROPPED_REORG",
        errorMessage: errorMessage || null,
      },
    });
  }

  async list(params: { status?: ChainActionStatus; type?: ChainActionType; chainId?: number; limit?: number }) {
    const where: Prisma.ChainActionReceiptWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.type) where.type = params.type;
    if (params.chainId) where.chainId = params.chainId;
    const take = Math.min(Math.max(params.limit || 50, 1), 200);
    return this.prisma.chainActionReceipt.findMany({
      where,
      orderBy: { observedAt: "desc" },
      take,
    });
  }

  async getById(id: string) {
    return this.prisma.chainActionReceipt.findUnique({ where: { id } });
  }
}
