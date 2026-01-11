/**
 * Admin CSRF guard for cookie-based sessions.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { createHash } from "crypto";
import { AdminAuthService } from "./admin-auth.service";
import {
  ADMIN_CSRF_HEADER,
} from "./security.constants";
import {
  getAccessTokenFromRequest,
  getCsrfTokenFromRequest,
  getRefreshTokenFromRequest,
} from "./cookies.util";
import { PrismaService } from "../prisma/prisma.service";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

@Injectable()
export class AdminCsrfGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly adminAuth: AdminAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const method = String(req.method || "GET").toUpperCase();
    if (SAFE_METHODS.has(method)) return true;

    const csrfCookie = getCsrfTokenFromRequest(req);
    const csrfHeader = (req.headers[ADMIN_CSRF_HEADER] as string | undefined) || "";
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException("ADMIN_CSRF_INVALID");
    }

    let sessionId: string | null = null;
    const accessToken = getAccessTokenFromRequest(req);
    if (accessToken) {
      try {
        const decoded: any = this.jwt.verify(accessToken);
        sessionId = decoded?.sid || null;
      } catch {
        sessionId = null;
      }
    }

    if (!sessionId) {
      const refreshToken = getRefreshTokenFromRequest(req);
      if (refreshToken) {
        const refreshTokenHash = hashToken(refreshToken);
        const session = await this.prisma.adminSession.findUnique({ where: { refreshTokenHash } });
        sessionId = session?.id || null;
      }
    }

    if (!sessionId) {
      throw new ForbiddenException("ADMIN_CSRF_SESSION_MISSING");
    }

    const valid = await this.adminAuth.validateCsrf(sessionId, csrfCookie);
    if (!valid) {
      throw new ForbiddenException("ADMIN_CSRF_INVALID");
    }
    return true;
  }
}
