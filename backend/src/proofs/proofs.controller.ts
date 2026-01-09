/**
 * Proof submission HTTP API.
 *
 * Handles proof uploads and references with optional anchoring requests.
 */
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Body,
  Request,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
  Inject,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { JwtGuard } from "../auth/jwt.guard";
import { PrismaService } from "../prisma/prisma.service";
import { ProofsService } from "./proofs.service";
import { StorageService } from "./storage.service";
import { StreamableFile } from "@nestjs/common";
import type { FastifyReply } from "fastify";
import { JwtService } from "@nestjs/jwt";
import { resolveJwtFromRequest } from "../auth/auth.request";
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiErrorResponses } from "../common/swagger/api-error.decorator";
import { ProofUploadDto, ProofUrlCreateDto } from "./dto";

const DEFAULT_MAX_MB = 10;

@ApiTags("proofs")
@ApiErrorResponses()
@Controller("proofs")
/** Proof submission and upload endpoints. */
export class ProofsController {
  constructor(
    private readonly proofs: ProofsService,
    private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
    private readonly jwt: JwtService,
  ) {}

  private async resolveViewer(req: any) {
    try {
      const decoded = await resolveJwtFromRequest<{ sub?: string }>(req, this.jwt);
      if (!decoded?.sub) return null;
      const viewer = await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } });
      return viewer?.userId || null;
    } catch {
      return null;
    }
  }

  private async requireAchusrId(req: any) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException("Unauthorized");
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { userId: true } });
    if (!user) throw new BadRequestException("Unauthorized");
    return user.userId;
  }

  @UseGuards(JwtGuard)
  @Post("upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: Math.floor(Number(process.env.PROOF_MAX_SIZE_MB || DEFAULT_MAX_MB) * 1024 * 1024) },
    }),
  )
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Upload a proof file" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        title: { type: "string" },
        description: { type: "string" },
        achievementId: { oneOf: [{ type: "string" }, { type: "number" }] },
        badgeTokenId: { oneOf: [{ type: "string" }, { type: "number" }] },
        autoAnchor: { type: "boolean" },
        anchor: { type: "boolean" },
      },
      required: ["file"],
    },
  })
  async uploadFile(
    @UploadedFile() file: any,
    @Body() body: ProofUploadDto,
    @Request() req: any,
  ) {
    if (!file) throw new BadRequestException("FILE_REQUIRED");
    const achusrId = await this.requireAchusrId(req);
    const data = await this.proofs.createFileProof(achusrId, file, body || {});
    return { success: true, data };
  }

  @UseGuards(JwtGuard)
  @Post("url")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Create a URL-based proof" })
  async createUrl(
    @Body() body: ProofUrlCreateDto,
    @Request() req: any,
  ) {
    const sourceUrl = body?.sourceUrl?.trim();
    if (!sourceUrl) throw new BadRequestException("SOURCE_URL_REQUIRED");
    const achusrId = await this.requireAchusrId(req);
    const data = await this.proofs.createUrlProof(achusrId, sourceUrl, body || {});
    return { success: true, data };
  }

  @UseGuards(JwtGuard)
  @Get(":id")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get a proof by id (owner only)" })
  async getOne(@Param("id") id: string, @Request() req: any) {
    const achusrId = await this.requireAchusrId(req);
    const data = await this.proofs.getProofForOwner(id, achusrId);
    return { success: true, data };
  }

  @Get(":id/file")
  @ApiOperation({ summary: "Download proof file" })
  async getFile(
    @Param("id") id: string,
    @Res({ passthrough: true }) res: FastifyReply,
    @Request() req: any,
    @Query("token") token?: string,
  ) {
    const viewer = await this.resolveViewer(req);
    const proof = await this.proofs.getProofForFile(id, null, viewer, token);
    const stream = this.storage.getFileStream(proof.storageKey!);
    res.header("Content-Type", proof.mimeType || "application/octet-stream");
    res.header("Content-Disposition", `inline; filename="${proof.storageKey}"`);
    return new StreamableFile(stream);
  }

  @UseGuards(JwtGuard)
  @Post(":id/anchor")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Request on-chain anchoring for a proof" })
  async anchor(@Param("id") id: string, @Request() req: any) {
    const achusrId = await this.requireAchusrId(req);
    const data = await this.proofs.anchorProof(id, achusrId);
    return { success: true, data };
  }
}

@ApiTags("users")
@ApiErrorResponses()
@Controller("users")
/** User-scoped proof listing endpoints. */
export class UserProofsController {
  constructor(
    private readonly proofs: ProofsService,
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async resolveViewer(req: any) {
    try {
      const decoded = await resolveJwtFromRequest<{ sub?: string }>(req, this.jwt);
      if (!decoded?.sub) return null;
      const viewer = await this.prisma.user.findUnique({ where: { id: decoded.sub }, select: { userId: true } });
      return viewer?.userId || null;
    } catch {
      return null;
    }
  }

  @Get(":userId/proofs")
  @ApiOperation({ summary: "List proofs for a user" })
  async listForUser(
    @Param("userId") userId: string,
    @Query("achievementId") achievementId?: string,
    @Query("badgeTokenId") badgeTokenId?: string,
    @Query("kind") kind?: string,
    @Query("limit") limit?: string,
    @Query("cursor") cursor?: string,
    @Request() req?: any,
  ) {
    const target = (userId || "").trim();
    if (!target) throw new BadRequestException("USER_ID_REQUIRED");
    const exists = await this.prisma.user.findUnique({ where: { userId: target }, select: { userId: true } });
    if (!exists) return { success: true, data: [], nextCursor: null };
    const viewer = await this.resolveViewer(req);
    const data = await this.proofs.listProofs(target, viewer, { achievementId, badgeTokenId, kind, limit, cursor });
    return { success: true, ...data };
  }
}
