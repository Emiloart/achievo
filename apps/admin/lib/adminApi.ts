type ApiError = {
  message: string;
  code?: string;
  status?: number;
  requestId?: string | null;
};

const API_BASE = process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL || "http://localhost:4000";

function parseCookies() {
  if (typeof document === "undefined") return {};
  return document.cookie.split(";").reduce<Record<string, string>>((acc, part) => {
    const [rawName, ...rest] = part.trim().split("=");
    if (!rawName) return acc;
    acc[rawName] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function getCsrfToken() {
  return parseCookies()["ach_admin_csrf"] || "";
}

async function parseJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function request<T>(
  path: string,
  options?: {
    method?: string;
    body?: any;
    retry?: boolean;
  },
): Promise<T> {
  const method = options?.method || "GET";
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (method !== "GET") {
    const csrf = getCsrfToken();
    if (csrf) headers["x-ach-admin-csrf"] = csrf;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    credentials: "include",
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (res.status === 401 && options?.retry !== false) {
    const refreshed = await refresh();
    if (refreshed) {
      return request<T>(path, { ...options, retry: false });
    }
  }
  if (!res.ok) {
    const payload = await parseJson(res);
    const error: ApiError = {
      message: payload?.error?.message || payload?.message || res.statusText,
      code: payload?.error?.code || payload?.code,
      status: res.status,
      requestId: payload?.error?.requestId || payload?.requestId || null,
    };
    throw error;
  }
  return (await parseJson(res)) as T;
}

export async function login(email: string, password: string) {
  return request<{ admin: { id: string; email: string; role: string } }>("/admin-auth/login", {
    method: "POST",
    body: { email, password },
  });
}

export async function refresh() {
  try {
    await request("/admin-auth/refresh", { method: "POST", body: {} , retry: false});
    return true;
  } catch {
    return false;
  }
}

export async function logout() {
  return request("/admin-auth/logout", { method: "POST", body: {} });
}

export async function me() {
  return request<{ id: string; email: string; role: string; csrfToken?: string }>("/admin-auth/me");
}

export async function overview() {
  return request("/admin-gateway/overview");
}

export async function health() {
  return request("/admin-gateway/health");
}

export async function alerts(params: { severity?: string; type?: string; since?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params.severity) search.set("severity", params.severity);
  if (params.type) search.set("type", params.type);
  if (params.since) search.set("since", params.since);
  if (params.limit) search.set("limit", String(params.limit));
  return request(`/admin-gateway/alerts?${search.toString()}`);
}

export async function chainActions(params: { status?: string; type?: string; chainId?: number; limit?: number }) {
  const search = new URLSearchParams();
  if (params.status) search.set("status", params.status);
  if (params.type) search.set("type", params.type);
  if (params.chainId) search.set("chainId", String(params.chainId));
  if (params.limit) search.set("limit", String(params.limit));
  return request(`/admin-gateway/chain-actions?${search.toString()}`);
}

export async function chainAction(id: string) {
  return request(`/admin-gateway/chain-actions/${id}`);
}

export async function anchoringStatus() {
  return request("/admin-gateway/anchoring/status");
}

export async function indexerStatus() {
  return request("/admin-gateway/indexer/status");
}

export async function orgSearch(query: string) {
  const search = new URLSearchParams({ q: query });
  return request(`/admin-gateway/orgs/search?${search.toString()}`);
}

export async function orgDetail(id: string) {
  return request(`/admin-gateway/orgs/${id}`);
}

export async function userSearch(query: string) {
  const search = new URLSearchParams({ q: query });
  return request(`/admin-gateway/users/search?${search.toString()}`);
}

export async function userDetail(id: string) {
  return request(`/admin-gateway/users/${id}`);
}

export async function usernameSearch(query: string) {
  const search = new URLSearchParams({ q: query });
  return request(`/admin-gateway/usernames/search?${search.toString()}`);
}

export async function adminUsers() {
  return request("/admin-gateway/admin-users");
}

export async function auditLogs(params: { adminUserId?: string; action?: string; since?: string; limit?: number }) {
  const search = new URLSearchParams();
  if (params.adminUserId) search.set("adminUserId", params.adminUserId);
  if (params.action) search.set("action", params.action);
  if (params.since) search.set("since", params.since);
  if (params.limit) search.set("limit", String(params.limit));
  return request(`/admin-gateway/audit?${search.toString()}`);
}

export async function envSummary() {
  return request("/admin-gateway/env");
}

export async function dryRun(action: string, payload: Record<string, any>) {
  return request("/admin-gateway/dry-run", {
    method: "POST",
    body: { action, payload },
  });
}

export async function execute(intentId: string, confirmPhrase: string, payload: Record<string, any>) {
  return request("/admin-gateway/execute", {
    method: "POST",
    body: { intentId, confirmPhrase, payload },
  });
}
