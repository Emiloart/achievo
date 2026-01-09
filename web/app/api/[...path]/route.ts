/**
 * API proxy route for the web client.
 *
 * Forwards requests to the backend while preserving cookies and filtering hop-by-hop headers.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const backendBase = (process.env.API_PROXY_TARGET || "http://127.0.0.1:4001").replace(/\/$/, "");

const hopByHopHeaders = new Set([
  "connection",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
]);

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawName, ...rest] = part.trim().split("=");
    if (!rawName) continue;
    if (rawName === name) return decodeURIComponent(rest.join("=") || "");
  }
  return null;
}

function buildProxyHeaders(req: NextRequest) {
  const headers = new Headers(req.headers);
  for (const name of headers.keys()) {
    if (hopByHopHeaders.has(name.toLowerCase())) {
      headers.delete(name);
    }
  }
  if (!SAFE_METHODS.has(req.method.toUpperCase())) {
    const existing = headers.get("x-ach-csrf");
    if (!existing) {
      const csrf = getCookieValue(req.headers.get("cookie"), "ach_csrf");
      if (csrf) headers.set("x-ach-csrf", csrf);
    }
  }
  return headers;
}

function parseCookieHeader(header: string | null) {
  const map = new Map<string, string>();
  if (!header) return map;
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (!name) continue;
    map.set(name, rest.join("="));
  }
  return map;
}

function mergeSetCookies(cookieHeader: string | null, setCookies: string[]) {
  const map = parseCookieHeader(cookieHeader);
  for (const cookie of setCookies) {
    const [pair] = cookie.split(";");
    if (!pair) continue;
    const [name, ...rest] = pair.trim().split("=");
    if (!name) continue;
    map.set(name, rest.join("="));
  }
  return Array.from(map.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

function collectSetCookies(headers: Headers) {
  const getSetCookie = (headers as any).getSetCookie?.bind(headers);
  if (getSetCookie) {
    const cookies = getSetCookie();
    if (Array.isArray(cookies)) return cookies;
  }
  const legacy = headers.get("set-cookie");
  return legacy ? [legacy] : [];
}

async function proxy(request: NextRequest, params: { path?: string[] }) {
  const path = params.path?.join("/") ?? "";
  const url = new URL(`${backendBase}/${path}`);
  url.search = request.nextUrl.search;

  const method = request.method;
  const headers = buildProxyHeaders(request);
  const body = method === "GET" || method === "HEAD" ? undefined : request.body;

  const fetchOptions: RequestInit = {
    method,
    headers,
    body,
    cache: "no-store",
  };
  if (body) {
    (fetchOptions as { duplex?: "half" }).duplex = "half";
  }

  const response = await fetch(url, fetchOptions);
  const shouldAttemptRefresh =
    response.status === 401 &&
    !path.startsWith("auth/") &&
    !path.startsWith("health") &&
    request.method.toUpperCase() !== "OPTIONS";

  if (shouldAttemptRefresh) {
    const refreshHeaders = new Headers(headers);
    refreshHeaders.set("content-length", "0");
    const refreshResponse = await fetch(new URL(`${backendBase}/auth/refresh`), {
      method: "POST",
      headers: refreshHeaders,
      cache: "no-store",
    });
    if (refreshResponse.ok) {
      const refreshCookies = collectSetCookies(refreshResponse.headers);
      const mergedCookieHeader = mergeSetCookies(headers.get("cookie"), refreshCookies);
      const retryHeaders = new Headers(headers);
      if (mergedCookieHeader) retryHeaders.set("cookie", mergedCookieHeader);
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers: retryHeaders,
      });
      const retryHeadersOut = new Headers(retryResponse.headers);
      retryHeadersOut.delete("content-encoding");
      retryHeadersOut.delete("content-length");
      const nextResponse = new NextResponse(retryResponse.body, {
        status: retryResponse.status,
        headers: retryHeadersOut,
      });
      for (const cookie of refreshCookies) {
        nextResponse.headers.append("set-cookie", cookie);
      }
      const retryCookies = collectSetCookies(retryResponse.headers);
      for (const cookie of retryCookies) {
        nextResponse.headers.append("set-cookie", cookie);
      }
      return nextResponse;
    }
  }

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  const nextResponse = new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders,
  });
  const cookies = collectSetCookies(response.headers);
  for (const cookie of cookies) {
    nextResponse.headers.append("set-cookie", cookie);
  }
  return nextResponse;
}

export const GET = (request: NextRequest, context: { params: { path?: string[] } }) =>
  proxy(request, context.params);
export const POST = (request: NextRequest, context: { params: { path?: string[] } }) =>
  proxy(request, context.params);
export const PUT = (request: NextRequest, context: { params: { path?: string[] } }) =>
  proxy(request, context.params);
export const PATCH = (request: NextRequest, context: { params: { path?: string[] } }) =>
  proxy(request, context.params);
export const DELETE = (request: NextRequest, context: { params: { path?: string[] } }) =>
  proxy(request, context.params);
export const OPTIONS = (request: NextRequest, context: { params: { path?: string[] } }) =>
  proxy(request, context.params);
