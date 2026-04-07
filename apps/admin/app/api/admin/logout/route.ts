import { NextResponse } from "next/server";
import { backendLogout } from "../../../../lib/server/backendAdminAuth";
import { clearCsrfCookie, validateCsrf } from "../../../../lib/server/adminCsrf";
import { clearSessionCookie, readSession } from "../../../../lib/server/adminSession";

export async function POST(request: Request) {
  const session = readSession();
  if (session && !validateCsrf(request)) {
    return NextResponse.json({ error: { message: "CSRF_INVALID" } }, { status: 403 });
  }

  if (session) {
    try {
      await backendLogout({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        csrfToken: session.csrfToken,
      });
    } catch {
      // Clear local session even if backend revocation fails.
    }
  }

  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);
  clearCsrfCookie(response);
  response.headers.set("cache-control", "no-store");
  return response;
}
