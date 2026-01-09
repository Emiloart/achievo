/**
 * Health and readiness probes.
 *
 * Aggregates liveness, RPC reachability, and indexer/anchoring backlog signals.
 */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AnchoringService } from "../anchoring/anchoring.service";
import { loadIndexerConfig } from "../indexer/indexer.config";
import { getRpcClient } from "../chain/reliability/rpc.client";
import { isRpcUnavailableError } from "../chain/reliability/rpc.errors";

type HealthStatus = "OK" | "DEGRADED" | "DOWN";
type HealthCheck = { name: string; status: HealthStatus; details?: any };

const ZERO_HASH = "0x" + "00".repeat(32);

function toNumberEnv(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw >= 0 ? Math.floor(raw) : fallback;
}

function nowIso() {
  return new Date().toISOString();
}

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function combineStatus(values: HealthStatus[]) {
  if (values.includes("DOWN")) return "DOWN";
  if (values.includes("DEGRADED")) return "DEGRADED";
  return "OK";
}

@Injectable()
/** Aggregates health and readiness signals across dependencies. */
export class HealthService {
  private readonly indexerConfig = loadIndexerConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly anchoring: AnchoringService,
  ) {}

  getLiveness() {
    return {
      ok: true,
      service: "backend",
      version: process.env.npm_package_version || "unknown",
      time: nowIso(),
    };
  }

  private chainTargets() {
    const targets: { chainId: number; rpcUrl: string; name: string }[] = [];
    const push = (name: string, chainId?: number, rpcUrl?: string) => {
      if (!chainId || !rpcUrl) return;
      targets.push({ name, chainId, rpcUrl });
    };

    const orgChainId = Number(process.env.ORG_CREATE_CHAIN_ID || "");
    const orgRpc =
      process.env.ORG_CREATE_RPC_URL ||
      process.env.BASE_SEPOLIA_RPC_URL ||
      process.env.BASE_SEPOLIA_RPC ||
      process.env.RPC_URL ||
      "";
    push("org", Number.isFinite(orgChainId) ? orgChainId : undefined, orgRpc);

    const anchorChainId = Number(process.env.ANCHOR_CHAIN_ID || "");
    const anchorRpc = process.env.ANCHOR_RPC_URL || process.env.RPC_URL || "";
    push("anchor", Number.isFinite(anchorChainId) ? anchorChainId : undefined, anchorRpc);

    const verifyChainId = Number(process.env.VERIFY_CHAIN_ID || "");
    const verifyRpc = process.env.VERIFY_CHAIN_RPC_URL || process.env.RPC_URL || "";
    push("verify", Number.isFinite(verifyChainId) ? verifyChainId : undefined, verifyRpc);

    if (this.indexerConfig.enabled) {
      push("indexer", this.indexerConfig.chainId, this.indexerConfig.rpcUrl);
    }

    const unique = new Map<string, { chainId: number; rpcUrl: string; name: string }>();
    for (const target of targets) {
      unique.set(`${target.chainId}:${target.rpcUrl}`, target);
    }
    return Array.from(unique.values());
  }

  async getChainHealth() {
    const warnMs = toNumberEnv("HEALTH_CHAIN_LATENCY_WARN_MS", 1500);
    const failMs = toNumberEnv("HEALTH_CHAIN_LATENCY_FAIL_MS", 5000);
    const finalityDepth = toNumberEnv("INDEXER_FINALITY_DEPTH", 20);
    const checks: HealthCheck[] = [];

    for (const target of this.chainTargets()) {
      const rpc = getRpcClient({
        chainId: target.chainId,
        rpcUrl: target.rpcUrl,
        name: `Health-${target.name}`,
      });
      const start = Date.now();
      try {
        const headBlock = await rpc.getBlockNumber();
        const latencyMs = Date.now() - start;
        const finalized = Math.max(headBlock - finalityDepth, 0);
        const status: HealthStatus =
          latencyMs >= failMs ? "DOWN" : latencyMs >= warnMs ? "DEGRADED" : "OK";
        checks.push({
          name: `chain:${target.chainId}`,
          status,
          details: {
            chainId: target.chainId,
            headBlock,
            finalizedBlock: finalized,
            latencyMs,
          },
        });
      } catch (error) {
        const status: HealthStatus = isRpcUnavailableError(error) ? "DOWN" : "DEGRADED";
        checks.push({
          name: `chain:${target.chainId}`,
          status,
          details: { chainId: target.chainId, error: (error as any)?.message || "RPC_ERROR" },
        });
      }
    }

    const status = combineStatus(checks.map((check) => check.status));
    return {
      ok: status === "OK",
      status,
      checks,
      time: nowIso(),
    };
  }

  async getIndexerHealth() {
    const enabled = this.indexerConfig.enabled;
    const warnBlocks = toNumberEnv("HEALTH_INDEXER_LAG_WARN_BLOCKS", 200);
    const failBlocks = toNumberEnv("HEALTH_INDEXER_LAG_FAIL_BLOCKS", 2000);
    const checks: HealthCheck[] = [];

    if (!enabled) {
      return {
        ok: false,
        status: "DOWN" as HealthStatus,
        enabled,
        checks: [{ name: "indexer", status: "DOWN", details: { reason: "DISABLED" } }],
        time: nowIso(),
      };
    }

    const cursor = await this.prisma.chainCursor.findUnique({ where: { chainId: this.indexerConfig.chainId } });
    let headBlock: number | null = null;
    try {
      const rpc = getRpcClient({
        chainId: this.indexerConfig.chainId,
        rpcUrl: this.indexerConfig.rpcUrl,
        name: "Health-Indexer",
      });
      headBlock = await rpc.getBlockNumber();
    } catch (error) {
      headBlock = null;
      checks.push({
        name: "indexer:rpc",
        status: "DEGRADED",
        details: { error: (error as any)?.message || "RPC_ERROR" },
      });
    }

    const latestProcessed = cursor?.latestProcessedBlock ?? null;
    const latestFinalized = cursor?.latestFinalizedBlock ?? null;
    const lagBlocks = headBlock !== null && latestProcessed !== null ? Math.max(headBlock - latestProcessed, 0) : null;

    let status: HealthStatus = "OK";
    if (lagBlocks !== null) {
      status = lagBlocks >= failBlocks ? "DOWN" : lagBlocks >= warnBlocks ? "DEGRADED" : "OK";
    } else {
      status = "DEGRADED";
    }

    checks.push({
      name: "indexer:lag",
      status,
      details: { lagBlocks },
    });

    return {
      ok: status === "OK",
      status,
      enabled,
      latestProcessedBlock: latestProcessed,
      latestFinalizedBlock: latestFinalized,
      headBlock,
      lagBlocks,
      lastSuccessfulRunAt: cursor?.updatedAt || null,
      checks,
      time: nowIso(),
    };
  }

  async getAnchoringHealth() {
    const enabled = this.anchoring.isEnabled();
    const warnPending = toNumberEnv("HEALTH_PENDING_CHAIN_ACTIONS_WARN", 50);
    const failPending = toNumberEnv("HEALTH_PENDING_CHAIN_ACTIONS_FAIL", 500);
    const stuckMinutes = toNumberEnv("HEALTH_STUCK_ACTION_AGE_MINUTES", 20);
    const cutoff = new Date(Date.now() - stuckMinutes * 60 * 1000);
    const checks: HealthCheck[] = [];

    if (!enabled) {
      return {
        ok: false,
        status: "DOWN" as HealthStatus,
        enabled,
        checks: [{ name: "anchoring", status: "DOWN", details: { reason: "DISABLED" } }],
        time: nowIso(),
      };
    }

    const registry = this.anchoring.getRegistryAddressSafe();
    let registryReachable = false;
    if (registry) {
      try {
        const rpc = getRpcClient({
          chainId: this.anchoring.getChainId(),
          rpcUrl: this.anchoring.getRpcUrl(),
          name: "Health-Anchor",
        });
        await rpc.readContract({
          address: registry,
          abi: [
            {
              inputs: [{ internalType: "bytes32", name: "hash", type: "bytes32" }],
              name: "isAnchored",
              outputs: [{ internalType: "bool", name: "", type: "bool" }],
              stateMutability: "view",
              type: "function",
            },
          ],
          functionName: "isAnchored",
          args: [ZERO_HASH],
        });
        registryReachable = true;
      } catch (error) {
        registryReachable = false;
        checks.push({
          name: "anchoring:registry",
          status: "DEGRADED",
          details: { error: (error as any)?.message || "RPC_ERROR" },
        });
      }
    }

    const pendingJobs = await this.prisma.anchorJob.count({ where: { status: "PENDING" } });
    const stuckJobs = await this.prisma.anchorJob.count({
      where: { status: "PENDING", createdAt: { lt: cutoff } },
    });
    const pendingActions = await this.prisma.chainActionReceipt.count({
      where: {
        status: "PENDING",
        type: { in: ["ANCHOR_PROOF", "ANCHOR_VALIDATION", "ANCHOR_EXPORT", "ANCHOR_SUBMISSION"] },
      },
    });
    const stuckActions = await this.prisma.chainActionReceipt.count({
      where: {
        status: "PENDING",
        observedAt: { lt: cutoff },
        type: { in: ["ANCHOR_PROOF", "ANCHOR_VALIDATION", "ANCHOR_EXPORT", "ANCHOR_SUBMISSION"] },
      },
    });

    const pendingTotal = pendingJobs + pendingActions;
    const stuckTotal = stuckJobs + stuckActions;
    let status: HealthStatus = "OK";
    if (!registryReachable) status = "DOWN";
    else if (pendingTotal >= failPending || stuckTotal >= failPending) status = "DOWN";
    else if (pendingTotal >= warnPending || stuckTotal >= warnPending) status = "DEGRADED";

    checks.push({
      name: "anchoring:backlog",
      status,
      details: { pendingTotal, stuckTotal },
    });

    return {
      ok: status === "OK",
      status,
      enabled,
      registryReachable,
      pendingAnchorJobs: pendingJobs,
      pendingAnchorActions: pendingActions,
      stuckPending: stuckTotal,
      checks,
      time: nowIso(),
    };
  }

  async getReadiness() {
    const checks: HealthCheck[] = [];
    let dbOk = true;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.push({ name: "db", status: "OK" });
    } catch (error) {
      dbOk = false;
      checks.push({
        name: "db",
        status: "DOWN",
        details: { error: (error as any)?.message || "DB_UNAVAILABLE" },
      });
    }

    const orgRequired = toBooleanEnv("ORG_CREATE_REQUIRED", false);
    const anchorEnabled = this.anchoring.isEnabled();
    const indexerEnabled = this.indexerConfig.enabled;

    for (const target of this.chainTargets()) {
      const isOrg = target.name === "org";
      const isAnchor = target.name === "anchor";
      const isIndexer = target.name === "indexer";
      const required = (isOrg && orgRequired) || (isAnchor && anchorEnabled) || (isIndexer && indexerEnabled);
      if (!required) continue;

      const rpc = getRpcClient({
        chainId: target.chainId,
        rpcUrl: target.rpcUrl,
        name: `Ready-${target.name}`,
      });
      try {
        await rpc.getBlockNumber();
        checks.push({
          name: `rpc:${target.chainId}`,
          status: "OK",
          details: { chainId: target.chainId },
        });
      } catch (error) {
        checks.push({
          name: `rpc:${target.chainId}`,
          status: "DOWN",
          details: { chainId: target.chainId, error: (error as any)?.message || "RPC_ERROR" },
        });
      }
    }

    const status = combineStatus(checks.map((check) => check.status));
    return {
      ok: dbOk && status === "OK",
      status,
      checks,
      time: nowIso(),
    };
  }
}
