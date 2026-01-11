/**
 * Admin audit logging service.
 */
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdminRole } from "@prisma/client";

const REDACT_KEYS = new Set(["password", "token", "secret", "privateKey", "authorization"]);

function pruneValue(value: any, depth = 0): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;
  if (depth > 3) return "[truncated]";
  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => pruneValue(item, depth + 1));
  }
  const entries = Object.entries(value).slice(0, 50);
  const out: Record<string, any> = {};
  for (const [key, val] of entries) {
    if (REDACT_KEYS.has(key)) {
      out[key] = "[redacted]";
    } else {
      out[key] = pruneValue(val, depth + 1);
    }
  }
  return out;
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    action: string;
    adminUserId?: string | null;
    role?: AdminRole | null;
    targetType?: string | null;
    targetId?: string | null;
    requestId?: string | null;
    ip?: string | null;
    userAgent?: string | null;
    method?: string | null;
    path?: string | null;
    statusCode?: number | null;
    adminKeyHash?: string | null;
    params?: any;
    result?: any;
    metadata?: any;
  }) {
    await this.prisma.adminAuditLog.create({
      data: {
        action: params.action,
        adminUserId: params.adminUserId || null,
        role: params.role || null,
        targetType: params.targetType || null,
        targetId: params.targetId || null,
        requestId: params.requestId || null,
        ip: params.ip || null,
        userAgent: params.userAgent || null,
        method: params.method || null,
        path: params.path || null,
        statusCode: params.statusCode || null,
        adminKeyHash: params.adminKeyHash || null,
        params: params.params ? pruneValue(params.params) : null,
        result: params.result ? pruneValue(params.result) : null,
        metadata: params.metadata ? pruneValue(params.metadata) : null,
      },
    });
  }
}
