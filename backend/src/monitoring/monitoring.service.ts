/**
 * Operational monitoring service.
 *
 * Emits alert records for stuck actions, lagging indexers, and RPC degradation.
 */
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { loadIndexerConfig } from "../indexer/indexer.config";
import { getRpcClient, getRpcClientSnapshots } from "../chain/reliability/rpc.client";
import { isRpcUnavailableError } from "../chain/reliability/rpc.errors";

type AlertSeverity = "INFO" | "WARN" | "CRITICAL";

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function toNumberEnv(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

@Injectable()
/** Periodically emits operational alerts and persists them for inspection. */
export class MonitoringService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MonitoringService.name);
  private timer: NodeJS.Timeout | null = null;
  private processing = false;
  private readonly indexerConfig = loadIndexerConfig();

  onModuleInit() {
    if (!toBooleanEnv("MONITORING_ENABLED", false)) return;
    const interval = toNumberEnv("MONITORING_INTERVAL_MS", 60000);
    this.timer = setInterval(() => {
      void this.run().catch((error) => this.logger.error(error));
    }, interval);
    void this.run().catch((error) => this.logger.error(error));
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  constructor(private readonly prisma: PrismaService) {}

  private async createAlert(type: any, severity: AlertSeverity, message: string, details: any) {
    const dedupeMinutes = toNumberEnv("MONITORING_DEDUPE_MINUTES", 5);
    const since = new Date(Date.now() - dedupeMinutes * 60 * 1000);
    const existing = await this.prisma.operationalAlert.findFirst({
      where: { type, severity, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) return;
    await this.prisma.operationalAlert.create({
      data: {
        type,
        severity,
        message,
        details,
      },
    });
  }

  private severityForCount(count: number, warn: number, fail: number): AlertSeverity | null {
    if (count >= fail) return "CRITICAL";
    if (count >= warn) return "WARN";
    return null;
  }

  private async monitorChainActions() {
    const warn = toNumberEnv("HEALTH_PENDING_CHAIN_ACTIONS_WARN", 50);
    const fail = toNumberEnv("HEALTH_PENDING_CHAIN_ACTIONS_FAIL", 500);
    const stuckMinutes = toNumberEnv("HEALTH_STUCK_ACTION_AGE_MINUTES", 20);
    const cutoff = new Date(Date.now() - stuckMinutes * 60 * 1000);

    const stuckCount = await this.prisma.chainActionReceipt.count({
      where: { status: "PENDING", observedAt: { lt: cutoff } },
    });
    const severity = this.severityForCount(stuckCount, warn, fail);
    if (severity) {
      await this.createAlert(
        "STUCK_CHAIN_ACTIONS",
        severity,
        `Stuck chain actions: ${stuckCount}`,
        { stuckCount, cutoff: cutoff.toISOString() },
      );
    }
  }

  private async monitorAnchorBacklog() {
    const warn = toNumberEnv("HEALTH_PENDING_CHAIN_ACTIONS_WARN", 50);
    const fail = toNumberEnv("HEALTH_PENDING_CHAIN_ACTIONS_FAIL", 500);
    const pendingJobs = await this.prisma.anchorJob.count({ where: { status: "PENDING" } });
    const pendingActions = await this.prisma.chainActionReceipt.count({
      where: {
        status: "PENDING",
        type: { in: ["ANCHOR_PROOF", "ANCHOR_VALIDATION", "ANCHOR_EXPORT", "ANCHOR_SUBMISSION"] },
      },
    });
    const pendingTotal = pendingJobs + pendingActions;
    const severity = this.severityForCount(pendingTotal, warn, fail);
    if (severity) {
      await this.createAlert(
        "ANCHOR_BACKLOG",
        severity,
        `Anchor backlog: ${pendingTotal}`,
        { pendingJobs, pendingActions },
      );
    }
  }

  private async monitorIndexerLag() {
    if (!this.indexerConfig.enabled) return;
    const warn = toNumberEnv("HEALTH_INDEXER_LAG_WARN_BLOCKS", 200);
    const fail = toNumberEnv("HEALTH_INDEXER_LAG_FAIL_BLOCKS", 2000);
    const cursor = await this.prisma.chainCursor.findUnique({ where: { chainId: this.indexerConfig.chainId } });
    if (!cursor) return;
    try {
      const rpc = getRpcClient({
        chainId: this.indexerConfig.chainId,
        rpcUrl: this.indexerConfig.rpcUrl,
        name: "Monitor-Indexer",
      });
      const head = await rpc.getBlockNumber();
      const lag = Math.max(head - cursor.latestProcessedBlock, 0);
      const severity = this.severityForCount(lag, warn, fail);
      if (severity) {
        await this.createAlert(
          "INDEXER_LAG",
          severity,
          `Indexer lag: ${lag} blocks`,
          { head, latestProcessedBlock: cursor.latestProcessedBlock, lag },
        );
      }
    } catch (error) {
      if (isRpcUnavailableError(error)) {
        await this.createAlert("RPC_DOWN", "CRITICAL", "Indexer RPC unavailable", {
          chainId: this.indexerConfig.chainId,
        });
      }
    }
  }

  private async monitorReorgSpike() {
    const warn = toNumberEnv("HEALTH_PENDING_CHAIN_ACTIONS_WARN", 50);
    const fail = toNumberEnv("HEALTH_PENDING_CHAIN_ACTIONS_FAIL", 500);
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.prisma.chainActionReceipt.count({
      where: {
        status: { in: ["FAILED", "DROPPED_REORG"] },
        updatedAt: { gte: since },
      },
    });
    const severity = this.severityForCount(count, warn, fail);
    if (severity) {
      await this.createAlert(
        "REORG_SPIKE",
        severity,
        `Failed/reorg actions in last hour: ${count}`,
        { count, since: since.toISOString() },
      );
    }
  }

  private async monitorRpcBreakers() {
    const snapshots = getRpcClientSnapshots();
    for (const snapshot of snapshots) {
      if (snapshot.breaker.state !== "OPEN") continue;
      await this.createAlert(
        "RPC_DOWN",
        "CRITICAL",
        `RPC circuit open for ${snapshot.name}`,
        { chainId: snapshot.chainId, rpcUrl: snapshot.rpcUrl },
      );
    }
  }

  async run() {
    if (this.processing) return;
    this.processing = true;
    try {
      await this.monitorChainActions();
      await this.monitorAnchorBacklog();
      await this.monitorIndexerLag();
      await this.monitorReorgSpike();
      await this.monitorRpcBreakers();
    } finally {
      this.processing = false;
    }
  }
}
