/**
 * Slow request detector.
 *
 * Logs warnings for requests exceeding a configurable duration threshold.
 */
import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

function toNumberEnv(name: string, fallback: number) {
  const raw = Number(process.env[name] ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : fallback;
}

@Injectable()
/** Emits warnings for slow HTTP requests based on configured thresholds. */
export class SlowRequestMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP_SLOW");
  private readonly thresholdMs = toNumberEnv("SLOW_REQUEST_WARN_MS", 1500);

  use(req: Request & { id?: string }, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      if (durationMs < this.thresholdMs) return;
      const payload = {
        message: "slow_request",
        requestId: req.id ?? null,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
      };
      this.logger.warn(JSON.stringify(payload));
    });
    next();
  }
}
