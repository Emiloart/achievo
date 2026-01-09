/**
 * Authentication cookie and header utilities.
 */
import type { Request } from "express";

/** Access token cookie name. */
export const ACCESS_COOKIE = "ach_access";
/** Refresh token cookie name. */
export const REFRESH_COOKIE = "ach_refresh";
/** CSRF cookie name. */
export const CSRF_COOKIE = "ach_csrf";
/** CSRF header name. */
export const CSRF_HEADER = "x-ach-csrf";

/** Parses a Cookie header into a name/value map. */
export function parseCookies(header?: string | null) {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(";");
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split("=");
    if (!rawName) continue;
    const value = rest.join("=");
    out[rawName] = decodeURIComponent(value || "");
  }
  return out;
}

/** Returns a cookie value by name from the request. */
export function getCookieValue(req: Request, name: string) {
  const cookies = parseCookies(req.headers.cookie);
  return cookies[name] || null;
}

/** Extracts the access token from cookies or Authorization header. */
export function getAccessTokenFromRequest(req: Request) {
  const cookieToken = getCookieValue(req, ACCESS_COOKIE);
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header) {
    const [scheme, token] = header.split(" ");
    if (scheme === "Bearer" && token) return token;
  }
  return null;
}

/** Extracts the refresh token from cookies. */
export function getRefreshTokenFromRequest(req: Request) {
  return getCookieValue(req, REFRESH_COOKIE);
}

/** Extracts the CSRF token from cookies. */
export function getCsrfTokenFromRequest(req: Request) {
  return getCookieValue(req, CSRF_COOKIE);
}
