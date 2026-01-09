/**
 * Metrics registry and exporter.
 *
 * Aggregates operational counters and gauges with explicit enablement.
 */
import { Injectable } from "@nestjs/common";
import { Counter, Gauge, Histogram, Registry, collectDefaultMetrics } from "prom-client";
import type { PrismaService } from "../prisma/prisma.service";
import type { RpcClient } from "../chain/reliability/rpc.client";

@Injectable()
/** Collects and exports operational metrics. */
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequestCounter: Counter<string>;
  private readonly httpRequestDuration: Histogram<string>;
  private readonly anchorJobCounter: Counter<string>;
  private readonly chainActionGauge: Gauge<string>;
  private readonly indexerLagGauge: Gauge<string>;
  private readonly rpcBreakerGauge: Gauge<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.httpRequestCounter = new Counter({
      name: "http_requests_total",
      help: "Total number of HTTP requests",
      labelNames: ["method", "route", "status"],
      registers: [this.registry],
    });
    this.httpRequestDuration = new Histogram({
      name: "http_request_duration_ms",
      help: "HTTP request duration in milliseconds",
      labelNames: ["method", "route", "status"],
      buckets: [25, 50, 100, 200, 500, 1000, 2000, 5000],
      registers: [this.registry],
    });
    this.anchorJobCounter = new Counter({
      name: "anchor_jobs_total",
      help: "Anchor job outcomes",
      labelNames: ["kind", "status"],
      registers: [this.registry],
    });
    this.chainActionGauge = new Gauge({
      name: "chain_actions_total",
      help: "Chain action receipts by status",
      labelNames: ["status"],
      registers: [this.registry],
    });
    this.indexerLagGauge = new Gauge({
      name: "indexer_lag_blocks",
      help: "Indexer lag in blocks",
      labelNames: ["chainId"],
      registers: [this.registry],
    });
    this.rpcBreakerGauge = new Gauge({
      name: "rpc_circuit_state",
      help: "RPC circuit breaker state",
      labelNames: ["chainId", "state"],
      registers: [this.registry],
    });
  }

  recordHttpRequest(method: string, route: string, status: number, durationMs: number) {
    const labels = { method, route, status: String(status) };
    this.httpRequestCounter.inc(labels);
    this.httpRequestDuration.observe(labels, durationMs);
  }

  recordAnchorJob(kind: string, status: "done" | "failed") {
    this.anchorJobCounter.inc({ kind, status });
  }

  async refreshOperationalMetrics(
    prisma: PrismaService,
    indexerConfig: { enabled: boolean; chainId: number; rpcUrl: string },
    snapshots: { chainId: number; breaker: { state: string } }[],
    getRpcClient: (config: { chainId: number; rpcUrl: string; name?: string }) => RpcClient,
  ) {
    type ChainActionCount = { status: string; _count: { status: number } };
    const counts = await prisma.chainActionReceipt.groupBy({
      by: ["status"],
      _count: { status: true },
    });
    for (const status of ["PENDING", "CONFIRMED", "FAILED", "DROPPED_REORG"]) {
      const record = (counts as ChainActionCount[]).find((item) => item.status === status);
      this.chainActionGauge.set({ status }, record?._count?.status ?? 0);
    }

    if (indexerConfig.enabled) {
      try {
        const cursor = await prisma.chainCursor.findUnique({ where: { chainId: indexerConfig.chainId } });
        const head = await getRpcClient({
          chainId: indexerConfig.chainId,
          rpcUrl: indexerConfig.rpcUrl,
          name: "Metrics-Indexer",
        }).getBlockNumber();
        const lag = cursor ? Math.max(head - cursor.latestProcessedBlock, 0) : 0;
        this.indexerLagGauge.set({ chainId: String(indexerConfig.chainId) }, lag);
      } catch {
        this.indexerLagGauge.set({ chainId: String(indexerConfig.chainId) }, 0);
      }
    }

    for (const snapshot of snapshots) {
      const chainId = String(snapshot.chainId);
      this.rpcBreakerGauge.set({ chainId, state: "CLOSED" }, snapshot.breaker.state === "CLOSED" ? 1 : 0);
      this.rpcBreakerGauge.set({ chainId, state: "OPEN" }, snapshot.breaker.state === "OPEN" ? 1 : 0);
      this.rpcBreakerGauge.set({ chainId, state: "HALF_OPEN" }, snapshot.breaker.state === "HALF_OPEN" ? 1 : 0);
    }
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType() {
    return this.registry.contentType;
  }
}
