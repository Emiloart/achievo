/**
 * CSRF guard for cookie-based sessions.
 *
 * Security boundary: blocks state-changing requests without a matching CSRF cookie/header pair.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import type { Request } from "express";
import {
  ACCESS_COOKIE,
  CSRF_HEADER,
  getCookieValue,
  getCsrfTokenFromRequest,
  getRefreshTokenFromRequest,
} from "../../auth/auth.util";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const EXEMPT_PATHS = ["/auth/nonce", "/auth/login", "/auth/verify"];

@Injectable()
/** Enforces CSRF checks for cookie-authenticated state changes. */
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const method = String(req.method || "GET").toUpperCase();
    if (SAFE_METHODS.has(method)) return true;
    const path = req.originalUrl || req.url || "";
    if (EXEMPT_PATHS.some((entry) => path.startsWith(entry))) return true;

    const hasCookieSession = Boolean(getCookieValue(req, ACCESS_COOKIE) || getRefreshTokenFromRequest(req));
    if (!hasCookieSession) return true;

    const csrfCookie = getCsrfTokenFromRequest(req);
    const csrfHeader = (req.headers[CSRF_HEADER] as string | undefined) || "";
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      throw new ForbiddenException("CSRF_INVALID");
    }
    return true;
  }
}
