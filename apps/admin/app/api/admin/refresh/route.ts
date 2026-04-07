import { NextResponse } from "next/server";
import { backendRefresh } from "../../../../lib/server/backendAdminAuth";
import { clearCsrfCookie, setCsrfCookie, validateCsrf } from "../../../../lib/server/adminCsrf";
import { clearSessionCookie, createSession, readSession, setSessionCookie } from "../../../../lib/server/adminSession";

function unauthorizedResponse() {
  const response = NextResponse.json({ error: { message: "UNAUTHORIZED" } }, { status: 401 });
  clearSessionCookie(response);
  clearCsrfCookie(response);
  response.headers.set("cache-control", "no-store");
  return response;
}

export async function POST(request: Request) {
  const session = readSession();
  if (!session) {
    return unauthorizedResponse();
  }
  if (!validateCsrf(request)) {
    return NextResponse.json({ error: { message: "CSRF_INVALID" } }, { status: 403 });
  }

  try {
    const result = await backendRefresh({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      csrfToken: session.csrfToken,
    });
    const refreshed = createSession(result.admin, result.tokens);
    const response = NextResponse.json({ admin: result.admin });
    setSessionCookie(response, refreshed);
    setCsrfCookie(response, refreshed.payload.csrfToken);
    response.headers.set("cache-control", "no-store");
    return response;
  } catch {
    return unauthorizedResponse();
  }
}
