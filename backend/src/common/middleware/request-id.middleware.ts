/**
 * Request correlation middleware.
 *
 * Assigns or propagates a request ID for consistent log correlation.
 */
import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

@Injectable()
/** Adds a request identifier to incoming requests and responses. */
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request & { id?: string }, res: Response, next: NextFunction) {
    const requestId = req.headers["x-request-id"]?.toString() || randomUUID();
    req.id = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  }
}
