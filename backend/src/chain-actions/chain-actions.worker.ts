/**
 * Chain action confirmation worker.
 *
 * Polls pending receipts, updates confirmations, and marks reorg outcomes deterministically.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ChainActionStatus, ChainActionType } from "@prisma/client";
import { ChainClient } from "../indexer/chain.client";
import { isRpcUnavailableError } from "../chain/reliability/rpc.errors";
import { PrismaService } from "../prisma/prisma.service";
import { ChainActionsService } from "./chain-actions.service";

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function toNumberEnv(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) ? raw : fallback;
}

function normalizeHash(raw?: string | null) {
  if (!raw) return null;
  const value = raw.startsWith("0x") ? raw : `0x${raw}`;
  return value.toLowerCase();
}

@Injectable()
/** Periodically confirms pending chain actions and handles reorg outcomes. */
export class ChainActionsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ChainActionsWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private processing = false;
  private readonly clients = new Map<number, ChainClient>();

  constructor(private readonly prisma: PrismaService, private readonly actions: ChainActionsService) {}

  onModuleInit() {
    if (!toBooleanEnv("CHAIN_ACTIONS_WORKER_ENABLED", false)) return;
    if (!this.actions.isEnabled()) return;
    const interval = Math.max(1000, toNumberEnv("CHAIN_ACTIONS_POLL_INTERVAL_MS", 30000));
    this.timer = setInterval(() => {
      void this.processPending().catch((error) => this.logger.error(error));
    }, interval);
    void this.processPending().catch((error) => this.logger.error(error));
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private getRpcUrl() {
    return (
      process.env.CHAIN_ACTIONS_RPC_URL ||
      process.env.INDEXER_RPC_URL ||
      process.env.BASE_SEPOLIA_RPC_URL ||
      process.env.BASE_SEPOLIA_RPC ||
      process.env.RPC_URL ||
      "https://sepolia.base.org"
    );
  }

  private client(chainId: number) {
    const existing = this.clients.get(chainId);
    if (existing) return existing;
    const client = new ChainClient({ chainId, rpcUrl: this.getRpcUrl() });
    this.clients.set(chainId, client);
    return client;
  }

  private async currentHead(chainId: number) {
    return this.client(chainId).getBlockNumber();
  }

  private async latestFinalized(chainId: number) {
    const cursor = await this.prisma.chainCursor.findUnique({ where: { chainId } });
    return cursor?.latestFinalizedBlock ?? null;
  }

  private async updateOrgStatusByReceipt(receipt: {
    id: string;
    type: ChainActionType;
    txHash: string;
    status: ChainActionStatus;
    chainId: number;
    blockNumber?: number | null;
    blockHash?: string | null;
    metadata?: any;
    finalizedAt?: Date | null;
  }) {
    if (receipt.type !== ChainActionType.ORG_CREATE) return;
    const orgId = receipt.metadata?.orgId as string | undefined;
    const txHash = normalizeHash(receipt.txHash);
    const payload: Record<string, any> = {
      onchainStatus:
        receipt.status === ChainActionStatus.CONFIRMED
          ? "CONFIRMED"
          : receipt.status === ChainActionStatus.DROPPED_REORG
            ? "DROPPED_REORG"
            : receipt.status === ChainActionStatus.FAILED
              ? "FAILED"
              : "PENDING_CONFIRMATIONS",
    };
    if (receipt.blockNumber) payload.onchainBlockNumber = receipt.blockNumber;
    if (receipt.blockHash) payload.onchainBlockHash = receipt.blockHash;
    if (receipt.finalizedAt) payload.onchainConfirmedAt = receipt.finalizedAt;

    if (orgId) {
      await this.prisma.organization.update({ where: { id: orgId }, data: payload });
      return;
    }
    if (txHash) {
      await this.prisma.organization.updateMany({
        where: {
          onchainCreationTxHash: txHash,
          onchainChainId: receipt.chainId,
        },
        data: payload,
      });
    }
  }

  private async updateUsernameTradeByReceipt(receipt: {
    id: string;
    type: ChainActionType;
    txHash: string;
    status: ChainActionStatus;
    chainId: number;
    blockNumber?: number | null;
    blockHash?: string | null;
    metadata?: any;
    finalizedAt?: Date | null;
  }) {
    if (receipt.type !== ChainActionType.USERNAME_TRANSFER) return;
    const tradeId = receipt.metadata?.tradeId as string | undefined;
    if (!tradeId) return;
    const trade = await this.prisma.usernameTrade.findUnique({ where: { id: tradeId } });
    if (!trade) return;

    const nextStatus =
      receipt.status === ChainActionStatus.CONFIRMED
        ? "CONFIRMED"
        : receipt.status === ChainActionStatus.FAILED
          ? "FAILED"
          : receipt.status === ChainActionStatus.DROPPED_REORG
            ? "DROPPED_REORG"
            : "PENDING";

    await this.prisma.usernameTrade.update({
      where: { id: tradeId },
      data: {
        status: nextStatus as any,
        txHash: trade.txHash || receipt.txHash,
        blockNumber: receipt.blockNumber ?? trade.blockNumber,
        confirmedAt: receipt.status === ChainActionStatus.CONFIRMED ? receipt.finalizedAt || new Date() : null,
      },
    });

    if (receipt.status === ChainActionStatus.DROPPED_REORG) {
      await this.prisma.operationalAlert.create({
        data: {
          severity: "WARN",
          type: "REORG_SPIKE",
          message: "Username transfer dropped due to reorg",
          details: {
            tradeId,
            txHash: receipt.txHash,
            chainId: receipt.chainId,
            handleHash: trade.handleHash,
          },
        },
      });
    }

    const orderIds = [trade.askOrderId, trade.bidOrderId, trade.offerOrderId].filter(Boolean) as string[];
    if (!orderIds.length) return;

    if (receipt.status === ChainActionStatus.CONFIRMED) {
      await this.prisma.usernameOrder.updateMany({
        where: { id: { in: orderIds } },
        data: { status: "FILLED" },
      });
      return;
    }

    if (receipt.status === ChainActionStatus.FAILED || receipt.status === ChainActionStatus.DROPPED_REORG) {
      await this.prisma.usernameOrder.updateMany({
        where: { id: { in: orderIds }, status: "RESERVED" },
        data: { status: "OPEN" },
      });
    }
  }

  async processPending() {
    if (this.processing) return;
    this.processing = true;
    try {
      const pending = await this.prisma.chainActionReceipt.findMany({
        where: { status: ChainActionStatus.PENDING },
        orderBy: { observedAt: "asc" },
        take: 100,
      });
      if (!pending.length) return;

      const headCache = new Map<number, number>();
      const finalizedCache = new Map<number, number | null>();

      for (const action of pending) {
        const chainId = action.chainId;
        if (!headCache.has(chainId)) {
          headCache.set(chainId, await this.currentHead(chainId));
        }
        if (!finalizedCache.has(chainId)) {
          finalizedCache.set(chainId, await this.latestFinalized(chainId));
        }

        const client = this.client(chainId);
        let receipt: any;
        try {
          receipt = await client.getTransactionReceipt(action.txHash as `0x${string}`);
        } catch (error: any) {
          if (isRpcUnavailableError(error)) {
            continue;
          }
          const name = error?.name || "";
          if (name === "TransactionReceiptNotFoundError") {
            await this.actions.markDroppedReorg(action.id, "RECEIPT_NOT_FOUND");
            await this.updateOrgStatusByReceipt({
              ...action,
              status: ChainActionStatus.DROPPED_REORG,
            });
            await this.updateUsernameTradeByReceipt({
              ...action,
              status: ChainActionStatus.DROPPED_REORG,
            });
          }
          continue;
        }

        const status = receipt.status === "success" ? ChainActionStatus.PENDING : ChainActionStatus.FAILED;
        if (status === ChainActionStatus.FAILED) {
          await this.actions.markFailed(action.id, "TX_REVERTED", "Transaction reverted");
          await this.updateOrgStatusByReceipt({
            ...action,
            status: ChainActionStatus.FAILED,
          });
          await this.updateUsernameTradeByReceipt({
            ...action,
            status: ChainActionStatus.FAILED,
          });
          continue;
        }

        const blockNumber = receipt.blockNumber ? Number(receipt.blockNumber) : null;
        const blockHash = receipt.blockHash ? String(receipt.blockHash).toLowerCase() : null;
        if (action.blockHash && blockHash && action.blockHash.toLowerCase() !== blockHash) {
          await this.actions.markDroppedReorg(action.id, "BLOCK_HASH_MISMATCH");
          await this.updateOrgStatusByReceipt({
            ...action,
            status: ChainActionStatus.DROPPED_REORG,
          });
          await this.updateUsernameTradeByReceipt({
            ...action,
            status: ChainActionStatus.DROPPED_REORG,
          });
          continue;
        }

        const head = headCache.get(chainId) ?? 0;
        const confirmations = blockNumber ? head - blockNumber + 1 : 0;
        const finalized = finalizedCache.get(chainId) ?? null;
        const required = action.confirmationsRequired || this.actions.getConfirmationsRequired();
        const isFinalized = finalized !== null && blockNumber !== null ? finalized >= blockNumber : false;
        const isConfirmed = isFinalized || confirmations >= required;

        if (isConfirmed) {
          const updated = await this.actions.markConfirmed(action.id, new Date());
          await this.updateOrgStatusByReceipt({
            ...action,
            status: ChainActionStatus.CONFIRMED,
            blockNumber: blockNumber ?? action.blockNumber,
            blockHash: blockHash ?? action.blockHash,
            finalizedAt: updated?.finalizedAt || new Date(),
          });
          await this.updateUsernameTradeByReceipt({
            ...action,
            status: ChainActionStatus.CONFIRMED,
            blockNumber: blockNumber ?? action.blockNumber,
            blockHash: blockHash ?? action.blockHash,
            finalizedAt: updated?.finalizedAt || new Date(),
          });
        }
      }
    } finally {
      this.processing = false;
    }
  }
}
