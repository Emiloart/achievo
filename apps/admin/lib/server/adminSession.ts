import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { AdminRole } from "../roles";

export type AdminIdentity = {
  id: string;
  email: string;
  role: AdminRole;
};

export type BackendTokens = {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
};

export type AdminSession = AdminIdentity &
  BackendTokens & {
    issuedAt: number;
    expiresAt: number;
  };

const SESSION_COOKIE = "ach_admin_console_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

function isProd() {
  return (process.env.NODE_ENV || "").toLowerCase() === "production";
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret() {
  const secret = process.env.ADMIN_CONSOLE_SESSION_SECRET || "";
  if (!secret) {
    throw new Error("ADMIN_CONSOLE_SESSION_SECRET_REQUIRED");
  }
  return secret;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function createSession(
  admin: AdminIdentity,
  tokens: BackendTokens,
): { token: string; payload: AdminSession } {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + SESSION_TTL_SECONDS;
  const payload: AdminSession = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    csrfToken: tokens.csrfToken,
    issuedAt,
    expiresAt,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const signature = sign(encoded);
  return { token: `${encoded}.${signature}`, payload };
}

export function readSession(): AdminSession | null {
  const cookie = cookies().get(SESSION_COOKIE)?.value;
  if (!cookie) return null;
  const [encoded, signature] = cookie.split(".");
  if (!encoded || !signature) return null;
  if (!safeEqual(signature, sign(encoded))) return null;
  try {
    const payload = JSON.parse(base64UrlDecode(encoded)) as AdminSession;
    if (!payload?.expiresAt || payload.expiresAt < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, session: { token: string }) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: session.token,
    httpOnly: true,
    sameSite: "strict",
    secure: isProd(),
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "strict",
    secure: isProd(),
    path: "/",
    maxAge: 0,
  });
}
