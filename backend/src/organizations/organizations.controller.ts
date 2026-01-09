/**
 * Organization HTTP API.
 *
 * Exposes creation, membership, and admin endpoints with RBAC and on-chain gating.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { JwtGuard } from "../auth/jwt.guard";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { OrganizationsService } from "./organizations.service";
import { OrgRoles } from "../org-rbac/org-rbac.decorator";
import { OrgGuard } from "../org-rbac/org-rbac.guard";
import type { Request as ExpressRequest } from "express";
import { OrgRegistryService } from "./orgRegistry.service";
import { RpcUnavailableError } from "../chain/reliability/rpc.errors";
import { hashHandle, normalizeHandle } from "./handle.util";
import { Logger } from "@nestjs/common";
import { resolveJwtFromRequest } from "../auth/auth.request";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiErrorResponses } from "../common/swagger/api-error.decorator";
import { OrgCreateRequestDto, OrgInviteRequestDto, OrgPrepareRequestDto, OrgUpdateRequestDto } from "./dto";

const SENSITIVE_TTL_RAW = Number(process.env.THROTTLE_SENSITIVE_TTL);
const SENSITIVE_LIMIT_RAW = Number(process.env.THROTTLE_SENSITIVE_LIMIT);
const SENSITIVE_TTL_SECONDS =
  Number.isFinite(SENSITIVE_TTL_RAW) && SENSITIVE_TTL_RAW > 0 ? SENSITIVE_TTL_RAW : 60;
const SENSITIVE_TTL_MS = SENSITIVE_TTL_SECONDS * 1000;
const SENSITIVE_LIMIT = Number.isFinite(SENSITIVE_LIMIT_RAW) && SENSITIVE_LIMIT_RAW > 0 ? SENSITIVE_LIMIT_RAW : 30;

@ApiTags("orgs")
@ApiErrorResponses()
@Controller("orgs")
/** Organization endpoints with RBAC and on-chain creation gating. */
export class OrganizationsController {
  private readonly logger = new Logger(OrganizationsController.name);
  constructor(
    private readonly orgs: OrganizationsService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly orgRegistry: OrgRegistryService,
  ) {}

  private async resolveAchusrId(req: ExpressRequest) {
    try {
      const decoded = await resolveJwtFromRequest<{ sub?: string }>(req, this.jwt);
      const user = decoded?.sub
        ? await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } })
        : null;
      return user?.userId || null;
    } catch {
      return null;
    }
  }

  @Post("prepare")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  @ApiOperation({ summary: "Prepare org creation on-chain requirements" })
  async prepare(@Body() body: OrgPrepareRequestDto) {
    const requirements = this.orgRegistry.getRequirements();
    let fee: string | null = null;
    let treasury: string | null = null;
    if (requirements.registry) {
      try {
        const onchainFee = await this.orgRegistry.getCreateOrgFee();
        fee = onchainFee.toString();
        treasury = await this.orgRegistry.getTreasury();
      } catch (error) {
        if (!(error instanceof RpcUnavailableError)) throw error;
      }
    }

    let normalizedHandle: string | null = null;
    let handleHash: string | null = null;
    if (body?.handle) {
      const normalized = normalizeHandle(body.handle);
      if (!normalized.valid) throw new BadRequestException("INVALID_HANDLE");
      normalizedHandle = normalized.handle;
      handleHash = hashHandle(normalized.handle).toLowerCase();
    }

    return {
      success: true,
      data: {
        required: requirements.required,
        chainId: requirements.chainId,
        registry: requirements.registry,
        fee,
        treasury,
        rules: requirements.rules,
        handle: normalizedHandle,
        handleHash,
        intent: {
          action: "CREATE_ORG",
          chainId: requirements.chainId,
          registry: requirements.registry,
          handle: normalizedHandle,
        },
      },
    };
  }

  @UseGuards(JwtGuard)
  @Post()
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Finalize org creation after on-chain tx" })
  async createOrg(
    @Body() body: OrgCreateRequestDto,
    @Request() req: ExpressRequest & { id?: string },
  ) {
    const userId = await this.resolveAchusrId(req);
    if (!userId) {
      throw new BadRequestException("USER_NOT_FOUND");
    }
    const data = await this.orgs.createOrg(userId || "", body);
    this.logger.log(
      JSON.stringify({
        message: "org_created",
        requestId: req.id ?? null,
        orgId: data.id,
        chainId: data.onchainChainId || data.chainId || null,
        txHash: data.onchainCreationTxHash || data.creationTxHash || null,
      }),
    );
    return { success: true, data };
  }

  @Get(":handle")
  @ApiOperation({ summary: "Get org by handle" })
  async getOrg(
    @Param("handle") handle: string,
    @Query("token") token: string | undefined,
    @Request() req: ExpressRequest,
  ) {
    const viewer = await this.resolveAchusrId(req);
    const data = await this.orgs.getOrgByHandle(handle, viewer, token || null);
    return { success: true, data };
  }

  @UseGuards(JwtGuard, OrgGuard)
  @OrgRoles("OWNER", "ADMIN")
  @Patch(":orgId")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Update org settings" })
  async updateOrg(@Param("orgId") orgId: string, @Body() body: OrgUpdateRequestDto) {
    const data = await this.orgs.updateOrg(orgId, body || {});
    return { success: true, data };
  }

  @Get(":orgId/members")
  @ApiOperation({ summary: "List org members" })
  async listMembers(
    @Param("orgId") orgId: string,
    @Query("token") token: string | undefined,
    @Request() req: ExpressRequest,
  ) {
    const viewer = await this.resolveAchusrId(req);
    const data = await this.orgs.listMembers(orgId, viewer, token || null);
    return { success: true, data };
  }

  @UseGuards(JwtGuard, OrgGuard)
  @OrgRoles("OWNER", "ADMIN")
  @Post(":orgId/invites")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Create org invite" })
  async createInvite(@Param("orgId") orgId: string, @Body() body: OrgInviteRequestDto, @Request() req: any) {
    const actorUserId = req.achusrId;
    const data = await this.orgs.createInvite(orgId, actorUserId, body || {});
    return { success: true, data };
  }
}
