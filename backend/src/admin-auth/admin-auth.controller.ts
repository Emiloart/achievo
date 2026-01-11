/**
 * Admin authentication HTTP API.
 */
import { Body, Controller, Get, Post, Request, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type { Request as ExpressRequest, Response } from "express";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import { AdminAuthService } from "./admin-auth.service";
import { ApiTags } from "@nestjs/swagger";
import { AdminLoginDto } from "./dto";
import { AdminAuthGuard } from "./admin-auth.guard";
import { AdminCsrfGuard } from "./admin-csrf.guard";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_CSRF_COOKIE,
  ADMIN_CSRF_HEADER,
  ADMIN_REFRESH_COOKIE,
} from "./security.constants";
import { getCsrfTokenFromRequest, getRefreshTokenFromRequest } from "./cookies.util";

function toBooleanEnv(name: string, fallback: boolean) {
  const raw = process.env[name];
  if (raw === undefined || raw === null || raw === "") return fallback;
  return String(raw).toLowerCase() === "true";
}

function cookieOptions(httpOnly: boolean, maxAgeMs?: number) {
  const isProd = toBooleanEnv("COOKIE_SECURE", (process.env.NODE_ENV || "").toLowerCase() === "production");
  return {
    httpOnly,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    ...(maxAgeMs ? { maxAge: maxAgeMs } : {}),
  };
}

const ADMIN_TTL_RAW = Number(process.env.THROTTLE_ADMIN_TTL);
const ADMIN_LIMIT_RAW = Number(process.env.THROTTLE_ADMIN_LIMIT);
const ADMIN_TTL_SECONDS = Number.isFinite(ADMIN_TTL_RAW) && ADMIN_TTL_RAW > 0 ? ADMIN_TTL_RAW : 60;
const ADMIN_TTL_MS = ADMIN_TTL_SECONDS * 1000;
const ADMIN_LIMIT = Number.isFinite(ADMIN_LIMIT_RAW) && ADMIN_LIMIT_RAW > 0 ? ADMIN_LIMIT_RAW : 10;

@ApiTags("admin-auth")
@Controller("admin-auth")
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Throttle({ default: { limit: ADMIN_LIMIT, ttl: ADMIN_TTL_MS } })
  @Post("login")
  async login(@Body() body: AdminLoginDto, @Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    await validateOrReject(plainToInstance(AdminLoginDto, body));
    const result = await this.auth.login({
      email: body.email,
      password: body.password,
      context: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || null,
        requestId: (req as any).id || null,
      },
    });
    res.cookie(ADMIN_ACCESS_COOKIE, result.accessToken, cookieOptions(true, this.auth.getAccessTokenTtlSeconds() * 1000));
    res.cookie(ADMIN_REFRESH_COOKIE, result.refreshToken, cookieOptions(true, this.auth.getRefreshTokenMaxAgeMs()));
    res.cookie(ADMIN_CSRF_COOKIE, result.csrfToken, cookieOptions(false, this.auth.getCsrfTokenMaxAgeMs()));
    return { admin: result.admin };
  }

  @Throttle({ default: { limit: ADMIN_LIMIT, ttl: ADMIN_TTL_MS } })
  @UseGuards(AdminCsrfGuard)
  @Post("refresh")
  async refresh(@Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return { success: false, error: "ADMIN_REFRESH_TOKEN_MISSING" };
    }
    const result = await this.auth.refresh({
      refreshToken,
      context: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || null,
        requestId: (req as any).id || null,
      },
    });
    res.cookie(ADMIN_ACCESS_COOKIE, result.accessToken, cookieOptions(true, this.auth.getAccessTokenTtlSeconds() * 1000));
    res.cookie(ADMIN_REFRESH_COOKIE, result.refreshToken, cookieOptions(true, this.auth.getRefreshTokenMaxAgeMs()));
    res.cookie(ADMIN_CSRF_COOKIE, result.csrfToken, cookieOptions(false, this.auth.getCsrfTokenMaxAgeMs()));
    return { admin: result.admin };
  }

  @UseGuards(AdminCsrfGuard)
  @Post("logout")
  async logout(@Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getRefreshTokenFromRequest(req);
    await this.auth.logout({
      refreshToken,
      context: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || null,
        requestId: (req as any).id || null,
      },
    });
    res.clearCookie(ADMIN_ACCESS_COOKIE, cookieOptions(true));
    res.clearCookie(ADMIN_REFRESH_COOKIE, cookieOptions(true));
    res.clearCookie(ADMIN_CSRF_COOKIE, cookieOptions(false));
    return { success: true };
  }

  @UseGuards(AdminAuthGuard)
  @Get("me")
  async me(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const admin = await this.auth.me(req.admin.sub);
    const existingCsrf = getCsrfTokenFromRequest(req);
    const csrfToken = await this.auth.ensureCsrfToken(req.admin.sessionId, existingCsrf);
    if (!existingCsrf || existingCsrf !== csrfToken) {
      res.cookie(ADMIN_CSRF_COOKIE, csrfToken, cookieOptions(false, this.auth.getCsrfTokenMaxAgeMs()));
    }
    return { ...admin, csrfToken };
  }

  @UseGuards(AdminAuthGuard)
  @Get("csrf")
  async csrf(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const csrfToken = await this.auth.ensureCsrfToken(req.admin.sessionId, getCsrfTokenFromRequest(req));
    res.cookie(ADMIN_CSRF_COOKIE, csrfToken, cookieOptions(false, this.auth.getCsrfTokenMaxAgeMs()));
    return { csrfToken, header: ADMIN_CSRF_HEADER };
  }
}
