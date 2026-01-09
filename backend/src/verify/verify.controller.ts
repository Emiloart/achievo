/**
 * Verification HTTP API.
 *
 * Exposes read-only endpoints for integrity checks and anchor verification.
 */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { FileInterceptor } from "@nestjs/platform-express";
import { VerifyService } from "./verify.service";

type UploadedFilePayload = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
};

const SENSITIVE_TTL_RAW = Number(process.env.THROTTLE_SENSITIVE_TTL);
const SENSITIVE_LIMIT_RAW = Number(process.env.THROTTLE_SENSITIVE_LIMIT);
const SENSITIVE_TTL_SECONDS =
  Number.isFinite(SENSITIVE_TTL_RAW) && SENSITIVE_TTL_RAW > 0 ? SENSITIVE_TTL_RAW : 60;
const SENSITIVE_TTL_MS = SENSITIVE_TTL_SECONDS * 1000;
const SENSITIVE_LIMIT = Number.isFinite(SENSITIVE_LIMIT_RAW) && SENSITIVE_LIMIT_RAW > 0 ? SENSITIVE_LIMIT_RAW : 30;

@Controller("verify")
/** Verification read endpoints for proofs, validations, and exports. */
export class VerifyController {
  constructor(private readonly verify: VerifyService) {}

  @Get("export/:publicId")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  async verifyExport(@Param("publicId") publicId: string, @Query("token") token?: string) {
    const data = await this.verify.verifyExport(publicId, token || null);
    return data;
  }

  @Get("proof/:id")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  async verifyProof(@Param("id") id: string, @Query("token") token?: string) {
    const data = await this.verify.verifyProof(id, token || null);
    return data;
  }

  @Post("proof/:id/check-file")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  @UseInterceptors(FileInterceptor("file"))
  async checkProofFile(
    @Param("id") id: string,
    @UploadedFile() file?: UploadedFilePayload,
    @Query("token") token?: string,
  ) {
    if (!file) throw new BadRequestException("FILE_REQUIRED");
    const data = await this.verify.verifyProofFile(id, file, token || null);
    return data;
  }

  @Get("validation/:id")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  async verifyValidation(@Param("id") id: string, @Query("token") token?: string) {
    const data = await this.verify.verifyValidation(id, token || null);
    return data;
  }

  @Get("anchor/:hash")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  async verifyAnchor(
    @Param("hash") hash: string,
    @Query("contract") contract?: string,
    @Query("txHash") txHash?: string,
  ) {
    const data = await this.verify.verifyAnchor(hash, contract || null, txHash || null);
    return data;
  }

  @Get("tx/:txHash")
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  async verifyAnchorTx(@Param("txHash") txHash: string, @Query("contract") contract?: string) {
    const data = await this.verify.verifyAnchorTx(txHash, contract || null);
    return data;
  }

  @Post()
  @Throttle({ default: { limit: SENSITIVE_LIMIT, ttl: SENSITIVE_TTL_MS } })
  async verifyUniversal(@Body() body: any) {
    const data = await this.verify.verifyUniversal(body || {});
    return data;
  }
}
