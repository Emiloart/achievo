/**
 * Metrics HTTP endpoint.
 *
 * Protected surface for operational metrics, disabled by default in production.
 */
import { Controller, Get, NotFoundException, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Response } from "express";
import { ConfigService } from "@nestjs/config";
import { MetricsService } from "./metrics.service";
import { AdminAuthGuard } from "../security/adminAuth/admin-auth.guard";
import { PrismaService } from "../prisma/prisma.service";
import { loadIndexerConfig } from "../indexer/indexer.config";
import { getRpcClientSnapshots } from "../chain/reliability/rpc.client";
import { getRpcClient } from "../chain/reliability/rpc.client";

const ADMIN_TTL_RAW = Number(process.env.THROTTLE_ADMIN_TTL);
const ADMIN_LIMIT_RAW = Number(process.env.THROTTLE_ADMIN_LIMIT);
const ADMIN_TTL_SECONDS = Number.isFinite(ADMIN_TTL_RAW) && ADMIN_TTL_RAW > 0 ? ADMIN_TTL_RAW : 60;
const ADMIN_TTL_MS = ADMIN_TTL_SECONDS * 1000;
const ADMIN_LIMIT = Number.isFinite(ADMIN_LIMIT_RAW) && ADMIN_LIMIT_RAW > 0 ? ADMIN_LIMIT_RAW : 30;

@Controller("metrics")
/** Metrics endpoint restricted to admin-authenticated requests. */
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @UseGuards(AdminAuthGuard)
  @Throttle({ default: { limit: ADMIN_LIMIT, ttl: ADMIN_TTL_MS } })
  @Get()
  async getMetrics(@Res({ passthrough: true }) res: Response) {
    const enabled = String(this.config.get("METRICS_ENABLED") || "").toLowerCase() === "true";
    if (!enabled) {
      throw new NotFoundException("METRICS_DISABLED");
    }
    await this.metrics.refreshOperationalMetrics(this.prisma, loadIndexerConfig(), getRpcClientSnapshots(), getRpcClient);
    res.setHeader("Content-Type", this.metrics.contentType);
    res.send(await this.metrics.getMetrics());
  }
}
