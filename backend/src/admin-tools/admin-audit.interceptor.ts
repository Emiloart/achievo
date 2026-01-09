/**
 * Admin audit interceptor.
 *
 * Records immutable audit events for admin API calls without leaking sensitive payloads.
 */
import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { finalize } from "rxjs";
import { PrismaService } from "../prisma/prisma.service";

function pruneValue(value: any, depth = 0): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (depth > 3) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => pruneValue(item, depth + 1));
  }
  const entries = Object.entries(value).slice(0, 20);
  const out: Record<string, any> = {};
  for (const [key, val] of entries) {
    out[key] = pruneValue(val, depth + 1);
  }
  return out;
}

@Injectable()
/** Writes admin audit records for each admin API request. */
export class AdminAuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const req = http.getRequest<any>();
    const res = http.getResponse<any>();
    const action = `${req?.method || "UNKNOWN"} ${req?.originalUrl || req?.url || ""}`.trim();
    const payload = {
      action,
      method: req?.method || null,
      path: req?.originalUrl || req?.url || null,
      adminKeyHash: req?.adminKeyHash || null,
      requestId: req?.id || null,
      metadata: {
        params: pruneValue(req?.params || {}),
        query: pruneValue(req?.query || {}),
        body: pruneValue(req?.body || {}),
        ip: req?.ip || null,
      },
    };

    return next.handle().pipe(
      finalize(() => {
        const statusCode = res?.statusCode || null;
        void this.prisma.adminAuditLog
          .create({
            data: {
              ...payload,
              statusCode,
            },
          })
          .catch(() => {});
      }),
    );
  }
}
