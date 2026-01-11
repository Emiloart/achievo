/**
 * Admin gateway HTTP API.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
  Patch,
} from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { AdminGatewayService } from "./admin-gateway.service";
import { ApiTags } from "@nestjs/swagger";
import { AdminAuthGuard } from "../admin-auth/admin-auth.guard";
import { AdminCsrfGuard } from "../admin-auth/admin-csrf.guard";
import { AdminRoles, AdminRolesGuard } from "../admin-auth/admin-roles.guard";
import { AdminRole } from "@prisma/client";
import { AdminActionRequestDto, AdminExecuteRequestDto } from "./dto/action.dto";
import { AdminUserCreateDto, AdminUserUpdateDto } from "./dto/admin-user.dto";

@ApiTags("admin-gateway")
@Controller("admin-gateway")
@UseGuards(AdminAuthGuard, AdminRolesGuard)
export class AdminGatewayController {
  constructor(private readonly gateway: AdminGatewayService) {}

  private actor(req: any) {
    return {
      id: req.admin.sub,
      role: req.admin.role,
      email: req.admin.email,
    };
  }

  private context(req: any) {
    return {
      requestId: req.id || null,
      ip: req.ip || null,
      userAgent: req.headers["user-agent"] || null,
      method: req.method || null,
      path: req.originalUrl || req.url || null,
    };
  }

  @UseGuards(AdminCsrfGuard)
  @Post("dry-run")
  async dryRun(@Body() body: AdminActionRequestDto, @Request() req: any) {
    await validateOrReject(plainToInstance(AdminActionRequestDto, body));
    return this.gateway.dryRun(body.action, body.payload, this.actor(req), this.context(req));
  }

  @UseGuards(AdminCsrfGuard)
  @Post("execute")
  async execute(@Body() body: AdminExecuteRequestDto, @Request() req: any) {
    await validateOrReject(plainToInstance(AdminExecuteRequestDto, body));
    return this.gateway.execute(
      { intentId: body.intentId, confirmPhrase: body.confirmPhrase, payload: body.payload },
      this.actor(req),
      this.context(req),
    );
  }

  @Get("overview")
  async overview(@Request() req: any) {
    return this.gateway.getOverview(this.actor(req), this.context(req));
  }

  @Get("health")
  async health(@Request() req: any) {
    return this.gateway.getHealth(this.actor(req), this.context(req));
  }

  @Get("alerts")
  async alerts(
    @Query("severity") severity: string | undefined,
    @Query("type") type: string | undefined,
    @Query("since") since: string | undefined,
    @Query("limit") limit: string | undefined,
    @Request() req: any,
  ) {
    return this.gateway.listAlerts(
      {
        severity,
        type,
        since,
        limit: limit ? Number(limit) : undefined,
      },
      this.actor(req),
      this.context(req),
    );
  }

  @Get("chain-actions")
  async chainActions(
    @Query("status") status: string | undefined,
    @Query("type") type: string | undefined,
    @Query("chainId") chainId: string | undefined,
    @Query("limit") limit: string | undefined,
    @Request() req: any,
  ) {
    return this.gateway.listChainActions(
      {
        status: status as any,
        type: type as any,
        chainId: chainId ? Number(chainId) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
      this.actor(req),
      this.context(req),
    );
  }

  @Get("chain-actions/:id")
  async chainAction(@Param("id") id: string, @Request() req: any) {
    return this.gateway.getChainAction(id, this.actor(req), this.context(req));
  }

  @Get("indexer/status")
  async indexerStatus(@Request() req: any) {
    return this.gateway.getIndexerStatus(this.actor(req), this.context(req));
  }

  @Get("anchoring/status")
  async anchoringStatus(@Request() req: any) {
    return this.gateway.getAnchoringStatus(this.actor(req), this.context(req));
  }

  @Get("orgs/search")
  async orgSearch(@Query("q") q: string | undefined, @Request() req: any) {
    return this.gateway.searchOrgs({ q }, this.actor(req), this.context(req));
  }

  @Get("orgs/:id")
  async orgDetail(@Param("id") id: string, @Request() req: any) {
    return this.gateway.getOrgDetail(id, this.actor(req), this.context(req));
  }

  @Get("users/search")
  async userSearch(@Query("q") q: string | undefined, @Request() req: any) {
    return this.gateway.searchUsers({ q }, this.actor(req), this.context(req));
  }

  @Get("users/:id")
  async userDetail(@Param("id") id: string, @Request() req: any) {
    return this.gateway.getUserDetail(id, this.actor(req), this.context(req));
  }

  @Get("usernames/search")
  async usernameSearch(@Query("q") q: string | undefined, @Request() req: any) {
    return this.gateway.searchUsernames({ q }, this.actor(req), this.context(req));
  }

  @Get("admin-users")
  @AdminRoles(AdminRole.SUPERADMIN)
  async adminUsers(@Request() req: any) {
    return this.gateway.listAdminUsers(this.actor(req), this.context(req));
  }

  @UseGuards(AdminCsrfGuard)
  @Post("admin-users")
  @AdminRoles(AdminRole.SUPERADMIN)
  async createAdminUser(
    @Body() body: AdminUserCreateDto,
    @Query("dryRun") dryRun: string | undefined,
    @Query("intentId") intentId: string | undefined,
    @Query("confirmPhrase") confirmPhrase: string | undefined,
    @Request() req: any,
  ) {
    await validateOrReject(plainToInstance(AdminUserCreateDto, body));
    const payload = { email: body.email, password: body.password, role: body.role };
    if (String(dryRun) === "true") {
      return this.gateway.dryRun("admin_user_create", payload, this.actor(req), this.context(req));
    }
    if (!intentId || !confirmPhrase) {
      throw new BadRequestException("ADMIN_INTENT_REQUIRED");
    }
    return this.gateway.execute({ intentId, confirmPhrase, payload }, this.actor(req), this.context(req));
  }

  @UseGuards(AdminCsrfGuard)
  @Patch("admin-users/:id")
  @AdminRoles(AdminRole.SUPERADMIN)
  async updateAdminUser(
    @Param("id") id: string,
    @Body() body: AdminUserUpdateDto,
    @Query("dryRun") dryRun: string | undefined,
    @Query("intentId") intentId: string | undefined,
    @Query("confirmPhrase") confirmPhrase: string | undefined,
    @Request() req: any,
  ) {
    await validateOrReject(plainToInstance(AdminUserUpdateDto, body));
    const payload = { id, ...body };
    if (String(dryRun) === "true") {
      return this.gateway.dryRun("admin_user_update", payload, this.actor(req), this.context(req));
    }
    if (!intentId || !confirmPhrase) {
      throw new BadRequestException("ADMIN_INTENT_REQUIRED");
    }
    return this.gateway.execute({ intentId, confirmPhrase, payload }, this.actor(req), this.context(req));
  }

  @Get("audit")
  @AdminRoles(AdminRole.ADMIN)
  async auditLogs(
    @Query("adminUserId") adminUserId: string | undefined,
    @Query("action") action: string | undefined,
    @Query("since") since: string | undefined,
    @Query("limit") limit: string | undefined,
    @Request() req: any,
  ) {
    return this.gateway.listAuditLogs(
      {
        adminUserId,
        action,
        since,
        limit: limit ? Number(limit) : undefined,
      },
      this.actor(req),
      this.context(req),
    );
  }

  @Get("env")
  @AdminRoles(AdminRole.ADMIN)
  async env(@Request() req: any) {
    return this.gateway.getEnvSummary(this.actor(req), this.context(req));
  }
}
