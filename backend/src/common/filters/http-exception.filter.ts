/**
 * Global HTTP exception filter.
 *
 * Normalizes error responses and attaches request identifiers without leaking stack traces in production.
 */
import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import type { Request, Response } from "express";

type ErrorResponse = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    statusCode: number;
    path?: string;
    requestId?: string | null;
    timestamp: string;
    debug?: {
      stack?: string;
    };
  };
};

@Catch()
/** Normalizes HTTP error responses into a consistent error shape. */
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request & { id?: string }>();
    const res = ctx.getResponse<Response>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = exception instanceof HttpException ? exception.getResponse() : null;
    const defaultMessage = exception instanceof Error ? exception.message : "Internal server error";

    let message = defaultMessage;
    let code = exception instanceof HttpException ? exception.name : "INTERNAL_SERVER_ERROR";
    let details: unknown = undefined;

    if (typeof response === "string") {
      message = response;
    } else if (response && typeof response === "object") {
      const payload = response as Record<string, any>;
      if (Array.isArray(payload.message)) {
        details = payload.message;
        message = payload.message.join(", ");
      } else if (payload.message) {
        message = payload.message;
      }
      code = payload.error || payload.code || code;
      if (payload.details !== undefined) {
        details = payload.details;
      }
    }

    const body: ErrorResponse = {
      success: false,
      error: {
        code: String(code || "ERROR"),
        message: String(message || "Request failed"),
        details,
        statusCode: status,
        path: req?.originalUrl || req?.url,
        requestId: req?.id ?? null,
        timestamp: new Date().toISOString(),
      },
    };
    if ((process.env.NODE_ENV || "").toLowerCase() !== "production") {
      const stack = exception instanceof Error ? exception.stack : undefined;
      body.error.debug = stack ? { stack } : undefined;
    }

    res.status(status).json(body);
  }
}
