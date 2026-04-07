import { normalizeRole } from "../roles";
import type { AdminIdentity, BackendTokens } from "./adminSession";

type BackendRequestOptions = {
  method?: string;
  body?: unknown;
  tokens?: BackendTokens;
  csrfHeaderName?: string;
};

type BackendAuthResult = {
  admin: AdminIdentity;
  tokens: BackendTokens;
};

const ACCESS_COOKIE = "ach_admin_access";
const REFRESH_COOKIE = "ach_admin_refresh";
const CSRF_COOKIE = "ach_admin_csrf";
const CSRF_HEADER = "x-ach-admin-csrf";

function getBackendBaseUrl() {
  return process.env.ADMIN_CONSOLE_BACKEND_URL || "http://localhost:4000";
}

function getSetCookieHeaders(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") {
    const values = headers.getSetCookie();
    if (values.length) return values;
  }
  const single = res.headers.get("set-cookie");
  return single ? single.split(/,(?=[^;]+?=)/) : [];
}

function parseSetCookies(values: string[]) {
  const parsed: Partial<BackendTokens> = {};
  for (const value of values) {
    const [pair] = value.split(";");
    if (!pair) continue;
    const index = pair.indexOf("=");
    if (index < 1) continue;
    const name = pair.slice(0, index).trim();
    const cookieValue = pair.slice(index + 1).trim();
    if (name === ACCESS_COOKIE) parsed.accessToken = cookieValue;
    if (name === REFRESH_COOKIE) parsed.refreshToken = cookieValue;
    if (name === CSRF_COOKIE) parsed.csrfToken = cookieValue;
  }
  return parsed;
}

function mergeTokens(current: BackendTokens, next: Partial<BackendTokens>): BackendTokens {
  return {
    accessToken: next.accessToken ?? current.accessToken,
    refreshToken: next.refreshToken ?? current.refreshToken,
    csrfToken: next.csrfToken ?? current.csrfToken,
  };
}

function requireTokens(next: Partial<BackendTokens>): BackendTokens {
  if (!next.accessToken || !next.refreshToken || !next.csrfToken) {
    throw new Error("ADMIN_TOKENS_MISSING");
  }
  return {
    accessToken: next.accessToken,
    refreshToken: next.refreshToken,
    csrfToken: next.csrfToken,
  };
}

function ensureAdminIdentity(payload: any): AdminIdentity {
  if (!payload?.id || !payload?.email) {
    throw new Error("ADMIN_IDENTITY_MISSING");
  }
  return {
    id: payload.id,
    email: payload.email,
    role: normalizeRole(payload.role),
  };
}

function buildCookieHeader(tokens: BackendTokens) {
  return `${ACCESS_COOKIE}=${tokens.accessToken}; ${REFRESH_COOKIE}=${tokens.refreshToken}; ${CSRF_COOKIE}=${tokens.csrfToken}`;
}

async function backendRequest(path: string, options: BackendRequestOptions = {}) {
  const url = new URL(path, getBackendBaseUrl());
  const method = options.method || "GET";
  const headers: Record<string, string> = {
    accept: "application/json",
    "x-api-version": "1",
  };

  let body: string | undefined;
  if (options.body !== undefined && method !== "GET" && method !== "HEAD") {
    headers["content-type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  if (options.tokens) {
    headers.cookie = buildCookieHeader(options.tokens);
    if (method !== "GET" && method !== "HEAD") {
      headers[options.csrfHeaderName || CSRF_HEADER] = options.tokens.csrfToken;
    }
  }

  const res = await fetch(url.toString(), {
    method,
    headers,
    body,
    cache: "no-store",
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  return { res, json, text, nextTokens: parseSetCookies(getSetCookieHeaders(res)) };
}

export async function backendLogin(email: string, password: string): Promise<BackendAuthResult> {
  const { res, json, nextTokens } = await backendRequest("/admin-auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || "LOGIN_FAILED");
  }
  return {
    admin: ensureAdminIdentity(json?.admin),
    tokens: requireTokens(nextTokens),
  };
}

export async function backendMe(tokens: BackendTokens): Promise<BackendAuthResult> {
  const { res, json, nextTokens } = await backendRequest("/admin-auth/me", { tokens });
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || "ADMIN_SESSION_INVALID");
  }
  return {
    admin: ensureAdminIdentity(json),
    tokens: mergeTokens(tokens, nextTokens),
  };
}

export async function backendRefresh(tokens: BackendTokens): Promise<BackendAuthResult> {
  const { res, json, nextTokens } = await backendRequest("/admin-auth/refresh", {
    method: "POST",
    body: {},
    tokens,
  });
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || "ADMIN_REFRESH_FAILED");
  }
  return {
    admin: ensureAdminIdentity(json?.admin),
    tokens: requireTokens(mergeTokens(tokens, nextTokens)),
  };
}

export async function backendLogout(tokens: BackendTokens) {
  await backendRequest("/admin-auth/logout", {
    method: "POST",
    body: {},
    tokens,
  });
}

export async function backendGatewayRequest(
  path: string,
  options: BackendRequestOptions & { tokens: BackendTokens },
) {
  const response = await backendRequest(path, options);
  return {
    res: response.res,
    json: response.json,
    text: response.text,
    tokens: mergeTokens(options.tokens, response.nextTokens),
  };
}
