/**
 * Administrative HTTP API.
 *
 * Restricted endpoints for diagnostics, retries, and deterministic rebuild operations.
 */
import { Body, BadRequestException, Controller, Param, Post, Query, UseGuards, UseInterceptors } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AdminAuthGuard } from "../security/adminAuth/admin-auth.guard";
import { AdminToolsService } from "./admin-tools.service";
import { ChainActionType } from "@prisma/client";
import { AdminAuditInterceptor } from "./admin-audit.interceptor";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiErrorResponses } from "../common/swagger/api-error.decorator";

const ADMIN_TTL_RAW = Number(process.env.THROTTLE_ADMIN_TTL);
const ADMIN_LIMIT_RAW = Number(process.env.THROTTLE_ADMIN_LIMIT);
const ADMIN_TTL_SECONDS = Number.isFinite(ADMIN_TTL_RAW) && ADMIN_TTL_RAW > 0 ? ADMIN_TTL_RAW : 60;
const ADMIN_TTL_MS = ADMIN_TTL_SECONDS * 1000;
const ADMIN_LIMIT = Number.isFinite(ADMIN_LIMIT_RAW) && ADMIN_LIMIT_RAW > 0 ? ADMIN_LIMIT_RAW : 30;

@ApiTags("admin")
@ApiErrorResponses()
@Controller("admin")
@UseGuards(AdminAuthGuard)
@Throttle({ default: { limit: ADMIN_LIMIT, ttl: ADMIN_TTL_MS } })
@UseInterceptors(AdminAuditInterceptor)
/** Restricted admin endpoints for operational diagnostics and recovery. */
export class AdminToolsController {
  constructor(private readonly admin: AdminToolsService) {}

  @Post("chain-actions/:id/retry")
  @ApiOperation({ summary: "Retry a chain action receipt" })
  async retryChainAction(
    @Param("id") id: string,
    @Query("force") force?: string,
    @Query("dryRun") dryRun?: string,
  ) {
    const result = await this.admin.retryChainAction(id, String(force) === "true", String(dryRun) === "true");
    return { success: true, result };
  }

  @Post("chain-actions/replay")
  @ApiOperation({ summary: "Replay chain action receipts within a block range" })
  async replayChainActions(
    @Body() body: { fromBlock: number; toBlock: number; chainId: number; types?: string[] },
    @Query("dryRun") dryRun?: string,
  ) {
    const rawTypes = (body.types || []).map((item) => String(item).toUpperCase());
    const types: ChainActionType[] = [];
    for (const value of rawTypes) {
      const entry = (ChainActionType as Record<string, ChainActionType>)[value];
      if (!entry) throw new BadRequestException("INVALID_CHAIN_ACTION_TYPE");
      types.push(entry);
    }
    const result = await this.admin.replayChainActions(
      {
        fromBlock: Number(body.fromBlock),
        toBlock: Number(body.toBlock),
        chainId: Number(body.chainId),
        types: types.length ? types : undefined,
      },
      String(dryRun) === "true",
    );
    return { success: true, result };
  }

  @Post("indexer/backfill")
  @ApiOperation({ summary: "Backfill the indexer for a block range" })
  async backfillIndexer(
    @Body() body: { fromBlock: number; toBlock: number; chainId: number },
    @Query("force") force?: string,
    @Query("dryRun") dryRun?: string,
  ) {
    const result = await this.admin.backfillIndexer(
      {
        fromBlock: Number(body.fromBlock),
        toBlock: Number(body.toBlock),
        chainId: Number(body.chainId),
        force: String(force) === "true",
      },
      String(dryRun) === "true",
    );
    return { success: true, result };
  }

  @Post("indexer/rebuild-projections")
  @ApiOperation({ summary: "Rebuild projections from decoded events" })
  async rebuildProjections(
    @Body()
    body: { fromBlock: number; toBlock: number; chainId: number; projectorKeys?: string[] },
    @Query("force") force?: string,
    @Query("dryRun") dryRun?: string,
  ) {
    const result = await this.admin.rebuildProjections(
      {
        fromBlock: Number(body.fromBlock),
        toBlock: Number(body.toBlock),
        chainId: Number(body.chainId),
        projectorKeys: body.projectorKeys,
        force: String(force) === "true",
      },
      String(dryRun) === "true",
    );
    return { success: true, result };
  }

  @Post("orgs/:orgId/reverify-tx")
  @ApiOperation({ summary: "Reverify an org creation transaction" })
  async reverifyOrgTx(@Param("orgId") orgId: string, @Query("dryRun") dryRun?: string) {
    const result = await this.admin.reverifyOrgTx(orgId, String(dryRun) === "true");
    return { success: true, result };
  }

  @Post("anchors/:entityType/:entityId/retry")
  @ApiOperation({ summary: "Retry an anchoring job" })
  async retryAnchor(
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string,
    @Query("dryRun") dryRun?: string,
  ) {
    const result = await this.admin.retryAnchor(entityType, entityId, String(dryRun) === "true");
    return { success: true, result };
  }
}
