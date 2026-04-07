import { NextResponse } from "next/server";
import { requestBackend } from "../../../../lib/server/adminGateway";
import { clearCsrfCookie, setCsrfCookie, validateCsrf } from "../../../../lib/server/adminCsrf";
import { clearSessionCookie, createSession, readSession, setSessionCookie } from "../../../../lib/server/adminSession";
import type { AdminRole } from "../../../../lib/roles";
import { roleAllows } from "../../../../lib/roles";

const ALLOWED_PREFIXES = ["/admin-gateway/", "/health"];

function requiredRoleForPath(path: string): AdminRole {
  if (path.startsWith("/health")) return "VIEWER";
  if (path.startsWith("/admin-gateway/overview")) return "VIEWER";
  if (path.startsWith("/admin-gateway/health")) return "VIEWER";
  if (path.startsWith("/admin-gateway/alerts")) return "VIEWER";
  if (path.startsWith("/admin-gateway/policies")) return "VIEWER";
  if (path.startsWith("/admin-gateway/chain-actions")) return "OPERATOR";
  if (path.startsWith("/admin-gateway/indexer")) return "OPERATOR";
  if (path.startsWith("/admin-gateway/anchoring")) return "OPERATOR";
  if (path.startsWith("/admin-gateway/orgs")) return "OPERATOR";
  if (path.startsWith("/admin-gateway/users")) return "ADMIN";
  if (path.startsWith("/admin-gateway/usernames")) return "ADMIN";
  if (path.startsWith("/admin-gateway/audit")) return "ADMIN";
  if (path.startsWith("/admin-gateway/admin-users")) return "SUPERADMIN";
  if (path.startsWith("/admin-gateway/env")) return "ADMIN";
  return "VIEWER";
}

function unauthorizedResponse() {
  const response = NextResponse.json({ error: { message: "UNAUTHORIZED" } }, { status: 401 });
  clearSessionCookie(response);
  clearCsrfCookie(response);
  return response;
}

async function handle(request: Request, params: { path: string[] }) {
  const session = readSession();
  if (!session) {
    return unauthorizedResponse();
  }

  const path = `/${params.path.join("/")}`;
  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return NextResponse.json({ error: { message: "NOT_ALLOWED" } }, { status: 403 });
  }

  const requiredRole = requiredRoleForPath(path);
  if (!roleAllows(session.role, requiredRole)) {
    return NextResponse.json({ error: { message: "FORBIDDEN" } }, { status: 403 });
  }

  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD" && !validateCsrf(request)) {
    return NextResponse.json({ error: { message: "CSRF_INVALID" } }, { status: 403 });
  }

  const body = method === "GET" || method === "HEAD" ? undefined : await request.json().catch(() => undefined);
  const query = new URL(request.url).search;
  const response = await requestBackend(session, { path, method, body, query });

  if (method !== "GET" && method !== "HEAD") {
    console.info("admin_gateway", {
      user: session.email,
      method,
      path,
      status: response.res.status,
    });
  }

  if (!response.res.ok) {
    return NextResponse.json(
      {
        error: {
          message: response.json?.error?.message || response.json?.message || "REQUEST_FAILED",
          code: response.json?.error?.code || response.json?.code,
          requestId: response.requestId,
        },
      },
      { status: response.res.status },
    );
  }

  const next = new NextResponse(response.text, {
    status: response.res.status,
    headers: {
      "content-type": response.res.headers.get("content-type") || "application/json",
    },
  });

  if (response.refreshed && response.admin) {
    const refreshed = createSession(response.admin, response.tokens);
    setSessionCookie(next, refreshed);
    setCsrfCookie(next, refreshed.payload.csrfToken);
  }
  if (response.requestId) {
    next.headers.set("x-request-id", response.requestId);
  }
  next.headers.set("cache-control", "no-store");
  return next;
}

export async function GET(request: Request, context: { params: { path: string[] } }) {
  return handle(request, context.params);
}

export async function POST(request: Request, context: { params: { path: string[] } }) {
  return handle(request, context.params);
}

export async function PATCH(request: Request, context: { params: { path: string[] } }) {
  return handle(request, context.params);
}

export async function PUT(request: Request, context: { params: { path: string[] } }) {
  return handle(request, context.params);
}

export async function DELETE(request: Request, context: { params: { path: string[] } }) {
  return handle(request, context.params);
}
