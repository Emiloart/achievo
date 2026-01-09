/**
 * Structured request logging middleware.
 *
 * Emits a JSON log line with request identifiers and timing data.
 */
import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
/** Logs request metadata for observability. */
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger("HTTP");

  use(req: Request & { id?: string }, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on("finish", () => {
      const durationMs = Date.now() - start;
      const payload = {
        message: "request",
        requestId: req.id ?? null,
        method: req.method,
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs,
      };
      this.logger.log(JSON.stringify(payload));
    });
    next();
  }
}
