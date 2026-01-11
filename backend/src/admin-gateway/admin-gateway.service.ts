/**
 * Admin gateway service for audited, role-gated admin operations.
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { AdminRole, ChainActionStatus, ChainActionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { AdminToolsService } from "../admin-tools/admin-tools.service";
import { ChainActionsService } from "../chain-actions/chain-actions.service";
import { AnchoringService } from "../anchoring/anchoring.service";
import { HealthService } from "../health/health.service";
import { loadIndexerConfig } from "../indexer/indexer.config";
import { getRpcClient } from "../chain/reliability/rpc.client";
import { AdminAuditService } from "../admin-audit/admin-audit.service";
import { AdminAuthService } from "../admin-auth/admin-auth.service";
import {
  AdminActionName,
  requiredRole,
  resolveAction,
  roleAllows,
} from "./admin-action-policy";
import { AdminIntentService } from "./admin-intent.service";

type AdminActor = {
  id: string;
  role: AdminRole;
  email?: string | null;
};

type RequestContext = {
  requestId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  method?: string | null;
  path?: string | null;
};

const CONFIRM_PHRASE = "EXECUTE";
const INTENT_TTL_MINUTES = 5;

function normalizeHash(value?: string | null) {
  if (!value) return null;
  const text = String(value);
  const prefixed = text.startsWith("0x") ? text : `0x${text}`;
  const hex = prefixed.slice(2);
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) return null;
  return `0x${hex.toLowerCase()}`;
}

function normalizeAddress(value?: string | null) {
  if (!value) return null;
  const text = String(value);
  const prefixed = text.startsWith("0x") ? text : `0x${text}`;
  return prefixed.toLowerCase();
}

@Injectable()
export class AdminGatewayService {
  private readonly indexerConfig = loadIndexerConfig();

  constructor(
    private readonly prisma: PrismaService,
    private readonly adminTools: AdminToolsService,
    private readonly chainActions: ChainActionsService,
    private readonly anchoring: AnchoringService,
    private readonly health: HealthService,
    private readonly audit: AdminAuditService,
    private readonly intents: AdminIntentService,
    private readonly adminAuth: AdminAuthService,
  ) {}

  private ensureAllowed(actor: AdminActor, action: AdminActionName) {
    const required = requiredRole(action);
    if (!roleAllows(actor.role, required)) {
      throw new ForbiddenException("ADMIN_ROLE_FORBIDDEN");
    }
  }

  private actionTarget(action: AdminActionName, payload: any) {
    switch (action) {
      case "chain_action_retry":
        return { targetType: "ChainAction", targetId: payload?.id || null };
      case "chain_action_replay":
        return { targetType: "ChainActionReplay", targetId: null };
      case "indexer_backfill":
        return { targetType: "IndexerBackfill", targetId: null };
      case "indexer_rebuild":
        return { targetType: "ProjectionRebuild", targetId: null };
      case "org_reverify":
        return { targetType: "Organization", targetId: payload?.orgId || null };
      case "anchor_retry":
        return { targetType: "Anchor", targetId: payload?.entityId || null };
      case "admin_user_create":
        return { targetType: "AdminUser", targetId: null };
      case "admin_user_update":
        return { targetType: "AdminUser", targetId: payload?.id || null };
      case "username_mark_suspicious":
        return { targetType: "Username", targetId: payload?.handleHash || payload?.normalized || null };
      default:
        return { targetType: null, targetId: null };
    }
  }

  private async executeAction(
    action: AdminActionName,
    payload: any,
    dryRun: boolean,
    actor: AdminActor,
  ) {
    switch (action) {
      case "chain_action_retry":
        return this.adminTools.retryChainAction(payload.id, Boolean(payload.force), dryRun);
      case "chain_action_replay":
        return this.adminTools.replayChainActions(
          {
            fromBlock: Number(payload.fromBlock),
            toBlock: Number(payload.toBlock),
            chainId: Number(payload.chainId),
            types: payload.types,
          },
          dryRun,
        );
      case "indexer_backfill":
        return this.adminTools.backfillIndexer(
          {
            fromBlock: Number(payload.fromBlock),
            toBlock: Number(payload.toBlock),
            chainId: Number(payload.chainId),
            force: Boolean(payload.force),
          },
          dryRun,
        );
      case "indexer_rebuild":
        return this.adminTools.rebuildProjections(
          {
            fromBlock: Number(payload.fromBlock),
            toBlock: Number(payload.toBlock),
            chainId: Number(payload.chainId),
            projectorKeys: payload.projectorKeys,
            force: Boolean(payload.force),
          },
          dryRun,
        );
      case "org_reverify":
        return this.adminTools.reverifyOrgTx(payload.orgId, dryRun);
      case "anchor_retry":
        return this.adminTools.retryAnchor(payload.entityType, payload.entityId, dryRun);
      case "admin_user_create":
        if (dryRun) {
          return { dryRun: true, email: payload.email, role: payload.role || AdminRole.VIEWER };
        }
        return this.adminAuth.createAdminUser({
          email: payload.email,
          password: payload.password,
          role: payload.role,
        });
      case "admin_user_update":
        if (dryRun) {
          return { dryRun: true, id: payload.id, updates: payload };
        }
        return this.adminAuth.updateAdminUser({
          id: payload.id,
          role: payload.role,
          isActive: payload.isActive,
          password: payload.password,
        });
      case "username_mark_suspicious":
        if (dryRun) {
          return { dryRun: true, normalized: payload.normalized, handleHash: payload.handleHash };
        }
        return this.prisma.operationalAlert.create({
          data: {
            severity: "WARN",
            type: "ADMIN_FLAG",
            message: "Admin flagged username as suspicious",
            details: {
              normalized: payload.normalized || null,
              handleHash: payload.handleHash || null,
              reason: payload.reason || null,
              actorId: actor.id,
              actorRole: actor.role,
            },
          },
        });
      default:
        throw new BadRequestException("ADMIN_ACTION_UNKNOWN");
    }
  }

  async dryRun(actionRaw: string, payload: any, actor: AdminActor, context: RequestContext) {
    const action = resolveAction(actionRaw);
    if (!action) throw new BadRequestException("ADMIN_ACTION_UNKNOWN");
    this.ensureAllowed(actor, action);
    const preview = await this.executeAction(action, payload, true, actor);
    const intent = await this.intents.createIntent({
      adminUserId: actor.id,
      action,
      payload,
      confirmPhrase: CONFIRM_PHRASE,
      ttlMinutes: INTENT_TTL_MINUTES,
    });
    const target = this.actionTarget(action, payload);
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: `DRY_RUN:${action}`,
      targetType: target.targetType,
      targetId: target.targetId,
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params: payload,
      result: preview,
    });
    return {
      preview,
      intentId: intent.id,
      confirmPhrase: intent.confirmPhrase,
      expiresAt: intent.expiresAt,
    };
  }

  async execute(params: { intentId: string; confirmPhrase: string; payload: any }, actor: AdminActor, context: RequestContext) {
    const intent = await this.intents.consumeIntent({
      adminUserId: actor.id,
      intentId: params.intentId,
      payload: params.payload,
      confirmPhrase: params.confirmPhrase,
    });
    const action = resolveAction(intent.action);
    if (!action) throw new BadRequestException("ADMIN_ACTION_UNKNOWN");
    this.ensureAllowed(actor, action);
    const result = await this.executeAction(action, params.payload, false, actor);
    const target = this.actionTarget(action, params.payload);
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: `EXECUTE:${action}`,
      targetType: target.targetType,
      targetId: target.targetId,
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params: params.payload,
      result,
    });
    return { result };
  }

  async getOverview(actor: AdminActor, context: RequestContext) {
    const now = Date.now();
    const cutoff = new Date(now - 24 * 60 * 60 * 1000);
    const stuckMinutes = Number(process.env.HEALTH_STUCK_ACTION_AGE_MINUTES || 20);
    const stuckCutoff = new Date(now - stuckMinutes * 60 * 1000);

    const [chainHealth, indexerHealth, anchoringHealth, readiness] = await Promise.all([
      this.health.getChainHealth(),
      this.health.getIndexerHealth(),
      this.health.getAnchoringHealth(),
      this.health.getReadiness(),
    ]);

    const [pendingChainActions, stuckChainActions] = await Promise.all([
      this.prisma.chainActionReceipt.count({ where: { status: ChainActionStatus.PENDING } }),
      this.prisma.chainActionReceipt.count({ where: { status: ChainActionStatus.PENDING, observedAt: { lt: stuckCutoff } } }),
    ]);

    const alerts = await this.prisma.operationalAlert.groupBy({
      by: ["severity"],
      where: { createdAt: { gte: cutoff } },
      _count: { id: true },
    });

    const pendingAnchors = await this.prisma.anchorJob.count({ where: { status: "PENDING" } });
    const pendingAnchorActions = await this.prisma.chainActionReceipt.count({
      where: {
        status: ChainActionStatus.PENDING,
        type: { in: ["ANCHOR_PROOF", "ANCHOR_VALIDATION", "ANCHOR_EXPORT", "ANCHOR_SUBMISSION"] },
      },
    });

    const recentRebuildRuns = await this.prisma.projectionRebuildRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
    });

    const overview = {
      health: {
        chain: chainHealth,
        indexer: indexerHealth,
        anchoring: anchoringHealth,
        readiness,
      },
      chainActions: {
        pending: pendingChainActions,
        stuck: stuckChainActions,
      },
      alertsLast24h: alerts.reduce<Record<string, number>>((acc, entry) => {
        acc[entry.severity] = entry._count.id;
        return acc;
      }, {}),
      anchoring: {
        pendingJobs: pendingAnchors,
        pendingActions: pendingAnchorActions,
      },
      indexer: {
        enabled: this.indexerConfig.enabled,
        chainId: this.indexerConfig.chainId,
        rpcUrl: this.indexerConfig.rpcUrl,
      },
      rebuildRuns: recentRebuildRuns,
    };

    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_OVERVIEW",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      result: overview,
    });

    return overview;
  }

  async getHealth(actor: AdminActor, context: RequestContext) {
    const data = {
      chain: await this.health.getChainHealth(),
      indexer: await this.health.getIndexerHealth(),
      anchoring: await this.health.getAnchoringHealth(),
      readiness: await this.health.getReadiness(),
    };
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_HEALTH",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      result: data,
    });
    return data;
  }

  async listAlerts(params: { severity?: string; type?: string; since?: string; limit?: number }, actor: AdminActor, context: RequestContext) {
    const where: any = {};
    if (params.severity) where.severity = params.severity;
    if (params.type) where.type = params.type;
    if (params.since) where.createdAt = { gte: new Date(params.since) };
    const take = Math.min(Math.max(params.limit || 50, 1), 200);
    const data = await this.prisma.operationalAlert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_ALERTS",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params,
      result: { count: data.length },
    });
    return data;
  }

  async listChainActions(params: { status?: ChainActionStatus; type?: ChainActionType; chainId?: number; limit?: number }, actor: AdminActor, context: RequestContext) {
    const data = await this.chainActions.list(params);
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_CHAIN_ACTIONS",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params,
      result: { count: data.length },
    });
    return data;
  }

  async getChainAction(id: string, actor: AdminActor, context: RequestContext) {
    const data = await this.chainActions.getById(id);
    if (!data) throw new NotFoundException("CHAIN_ACTION_NOT_FOUND");
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_CHAIN_ACTION",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params: { id },
    });
    return data;
  }

  async getIndexerStatus(actor: AdminActor, context: RequestContext) {
    const cursor = await this.prisma.chainCursor.findUnique({ where: { chainId: this.indexerConfig.chainId } });
    let headBlock: number | null = null;
    if (this.indexerConfig.enabled) {
      try {
        const rpc = getRpcClient({
          chainId: this.indexerConfig.chainId,
          rpcUrl: this.indexerConfig.rpcUrl,
          name: "AdminIndexerStatus",
        });
        headBlock = await rpc.getBlockNumber();
      } catch {
        headBlock = null;
      }
    }
    const data = {
      enabled: this.indexerConfig.enabled,
      chainId: this.indexerConfig.chainId,
      rpcUrl: this.indexerConfig.rpcUrl,
      latestProcessedBlock: cursor?.latestProcessedBlock ?? null,
      latestFinalizedBlock: cursor?.latestFinalizedBlock ?? null,
      headBlock,
    };
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_INDEXER_STATUS",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      result: data,
    });
    return data;
  }

  async getAnchoringStatus(actor: AdminActor, context: RequestContext) {
    const pendingJobs = await this.prisma.anchorJob.count({ where: { status: "PENDING" } });
    const pendingActions = await this.prisma.chainActionReceipt.count({
      where: {
        status: ChainActionStatus.PENDING,
        type: { in: ["ANCHOR_PROOF", "ANCHOR_VALIDATION", "ANCHOR_EXPORT", "ANCHOR_SUBMISSION"] },
      },
    });
    const data = {
      enabled: this.anchoring.isEnabled(),
      chainId: this.anchoring.getChainId(),
      registry: this.anchoring.getRegistryAddressSafe(),
      pendingJobs,
      pendingActions,
    };
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_ANCHORING_STATUS",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      result: data,
    });
    return data;
  }

  async searchOrgs(query: { q?: string }, actor: AdminActor, context: RequestContext) {
    const q = String(query.q || "").trim();
    if (!q) return [];
    const where = {
      OR: [
        { id: q },
        { handle: { contains: q, mode: "insensitive" as const } },
      ],
    };
    const data = await this.prisma.organization.findMany({ where, take: 25, orderBy: { createdAt: "desc" } });
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_ORGS",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params: { q },
      result: { count: data.length },
    });
    return data;
  }

  async searchUsers(query: { q?: string }, actor: AdminActor, context: RequestContext) {
    const q = String(query.q || "").trim();
    if (!q) return [];
    const where = {
      OR: [
        { id: q },
        { userId: { contains: q, mode: "insensitive" as const } },
        { primaryWallet: { contains: q, mode: "insensitive" as const } },
      ],
    };
    const users = await this.prisma.user.findMany({ where, take: 25, orderBy: { createdAt: "desc" } });
    const results = await Promise.all(
      users.map(async (user) => {
        const [risk, consistency] = await Promise.all([
          this.prisma.userRiskProfile.findUnique({ where: { userId: user.id } }),
          this.prisma.userConsistencyScore.findUnique({ where: { userId: user.id } }),
        ]);
        return {
          ...user,
          risk,
          consistency,
        };
      }),
    );
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_USERS",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params: { q },
      result: { count: results.length },
    });
    return results;
  }

  async searchUsernames(query: { q?: string }, actor: AdminActor, context: RequestContext) {
    const q = String(query.q || "").trim();
    if (!q) return [];
    const normalized = q.toLowerCase();
    const handleHash = normalizeHash(q);
    const usernames = await this.prisma.username.findMany({
      where: {
        OR: [
          { usernameNormalized: normalized },
          { username: { contains: q, mode: "insensitive" as const } },
        ],
      },
      take: 10,
    });
    const orders = await this.prisma.usernameOrder.findMany({
      where: {
        OR: [
          { usernameNormalized: normalized },
          { handleHash: handleHash || undefined },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    const trades = await this.prisma.usernameTrade.findMany({
      where: {
        OR: [
          { usernameNormalized: normalized },
          { handleHash: handleHash || undefined },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const chainActions = await this.prisma.chainActionReceipt.findMany({
      where: {
        type: ChainActionType.USERNAME_TRANSFER,
        OR: [
          handleHash
            ? {
                metadata: {
                  path: ["handleHash"],
                  equals: handleHash,
                },
              }
            : undefined,
          {
            metadata: {
              path: ["normalized"],
              equals: normalized,
            },
          },
        ].filter(Boolean) as any,
      },
      orderBy: { observedAt: "desc" },
      take: 20,
    });

    const data = { usernames, orders, trades, chainActions };
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_USERNAMES",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params: { q },
      result: {
        usernames: usernames.length,
        orders: orders.length,
        trades: trades.length,
        chainActions: chainActions.length,
      },
    });
    return data;
  }

  async listAdminUsers(actor: AdminActor, context: RequestContext) {
    const data = await this.prisma.adminUser.findMany({ orderBy: { createdAt: "desc" } });
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_ADMIN_USERS",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      result: { count: data.length },
    });
    return data;
  }

  async listAuditLogs(params: { adminUserId?: string; action?: string; since?: string; limit?: number }, actor: AdminActor, context: RequestContext) {
    const where: any = {};
    if (params.adminUserId) where.adminUserId = params.adminUserId;
    if (params.action) where.action = params.action;
    if (params.since) where.createdAt = { gte: new Date(params.since) };
    const take = Math.min(Math.max(params.limit || 100, 1), 500);
    const data = await this.prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
    });
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_ADMIN_AUDIT",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params,
      result: { count: data.length },
    });
    return data;
  }

  async getEnvSummary(actor: AdminActor, context: RequestContext) {
    const data = {
      chainId: Number(process.env.CHAIN_ID || 0) || null,
      orgCreateRequired: process.env.ORG_CREATE_REQUIRED === "true",
      anchoringEnabled: process.env.ANCHORING_ENABLED === "true",
      indexerEnabled: process.env.INDEXER_ENABLED === "true",
      governanceSanityCheckEnabled: process.env.GOVERNANCE_SANITY_CHECK_ENABLED === "true",
      configStrict: process.env.CONFIG_STRICT === "true",
    };
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_ENV_SUMMARY",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      result: data,
    });
    return data;
  }

  async resolveOrgChainActions(orgId: string) {
    return this.prisma.chainActionReceipt.findMany({
      where: {
        metadata: {
          path: ["orgId"],
          equals: orgId,
        },
      },
      orderBy: { observedAt: "desc" },
      take: 10,
    });
  }

  async getOrgDetail(orgId: string, actor: AdminActor, context: RequestContext) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException("ORG_NOT_FOUND");
    const chainActions = await this.resolveOrgChainActions(org.id);
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_ORG_DETAIL",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params: { orgId },
    });
    return { org, chainActions };
  }

  async getUserDetail(userId: string, actor: AdminActor, context: RequestContext) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("USER_NOT_FOUND");
    const [risk, consistency] = await Promise.all([
      this.prisma.userRiskProfile.findUnique({ where: { userId: user.id } }),
      this.prisma.userConsistencyScore.findUnique({ where: { userId: user.id } }),
    ]);
    const chainActions = await this.prisma.chainActionReceipt.findMany({
      where: {
        OR: [
          { fromAddress: normalizeAddress(user.primaryWallet) || undefined },
          { toAddress: normalizeAddress(user.primaryWallet) || undefined },
        ],
      },
      orderBy: { observedAt: "desc" },
      take: 10,
    });
    await this.audit.record({
      adminUserId: actor.id,
      role: actor.role,
      action: "READ_USER_DETAIL",
      requestId: context.requestId || null,
      ip: context.ip || null,
      userAgent: context.userAgent || null,
      method: context.method || null,
      path: context.path || null,
      params: { userId },
    });
    return { user, risk, consistency, chainActions };
  }
}
