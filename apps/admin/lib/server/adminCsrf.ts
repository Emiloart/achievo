import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const ADMIN_CSRF_COOKIE = "ach_admin_csrf";
export const ADMIN_CSRF_HEADER = "x-ach-admin-csrf";

const CSRF_TTL_SECONDS = 60 * 60 * 8;

function isProd() {
  return (process.env.NODE_ENV || "").toLowerCase() === "production";
}

export function readCsrfToken() {
  return cookies().get(ADMIN_CSRF_COOKIE)?.value ?? null;
}

export function setCsrfCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: ADMIN_CSRF_COOKIE,
    value: token,
    httpOnly: false,
    sameSite: "strict",
    secure: isProd(),
    path: "/",
    maxAge: CSRF_TTL_SECONDS,
  });
}

export function clearCsrfCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_CSRF_COOKIE,
    value: "",
    httpOnly: false,
    sameSite: "strict",
    secure: isProd(),
    path: "/",
    maxAge: 0,
  });
}

export function validateCsrf(request: Request) {
  const header = request.headers.get(ADMIN_CSRF_HEADER);
  const cookie = readCsrfToken();
  if (!header || !cookie) return false;
  return header === cookie;
}
