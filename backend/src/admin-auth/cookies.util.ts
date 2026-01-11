/**
 * Cookie helpers for admin authentication.
 */
import type { Request } from "express";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_CSRF_COOKIE,
  ADMIN_REFRESH_COOKIE,
} from "./security.constants";

function parseCookies(header?: string | null) {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(";");
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split("=");
    if (!rawName) continue;
    out[rawName] = decodeURIComponent(rest.join("=") || "");
  }
  return out;
}

export function getCookieValue(req: Request, name: string) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[name] || null;
}

export function getAccessTokenFromRequest(req: Request) {
  return getCookieValue(req, ADMIN_ACCESS_COOKIE);
}

export function getRefreshTokenFromRequest(req: Request) {
  return getCookieValue(req, ADMIN_REFRESH_COOKIE);
}

export function getCsrfTokenFromRequest(req: Request) {
  return getCookieValue(req, ADMIN_CSRF_COOKIE);
}
