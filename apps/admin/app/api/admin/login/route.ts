import { NextResponse } from "next/server";
import { backendLogin } from "../../../../lib/server/backendAdminAuth";
import { setCsrfCookie } from "../../../../lib/server/adminCsrf";
import { createSession, setSessionCookie } from "../../../../lib/server/adminSession";
import { checkLoginLimit, recordLoginFailure, recordLoginSuccess } from "../../../../lib/server/loginRateLimit";

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkLoginLimit(ip);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: { message: limit.locked ? "LOGIN_LOCKED" : "RATE_LIMITED", retryAfter: limit.retryAfterSeconds } },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const email = String(body?.email || body?.username || "").trim();
  const password = String(body?.password || "");

  if (!email || !password) {
    return NextResponse.json({ error: { message: "EMAIL_AND_PASSWORD_REQUIRED" } }, { status: 400 });
  }

  try {
    const result = await backendLogin(email, password);
    recordLoginSuccess(ip);
    const session = createSession(result.admin, result.tokens);
    const response = NextResponse.json({ admin: result.admin });
    setSessionCookie(response, session);
    setCsrfCookie(response, session.payload.csrfToken);
    response.headers.set("cache-control", "no-store");
    return response;
  } catch (error: any) {
    recordLoginFailure(ip);
    return NextResponse.json({ error: { message: error?.message || "INVALID_CREDENTIALS" } }, { status: 401 });
  }
}
