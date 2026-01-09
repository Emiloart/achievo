/**
 * Authentication HTTP API.
 *
 * Exposes nonce, login, refresh, and logout endpoints with cookie-based session semantics.
 */
import { Body, Controller, Get, Post, Request, Res, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthService } from "./auth.service";
import { JwtGuard } from "./jwt.guard";
import { LoginRequestDto, NonceRequestDto, VerifyRequestDto } from "./dto";
import { plainToInstance } from "class-transformer";
import { validateOrReject } from "class-validator";
import type { Response, Request as ExpressRequest } from "express";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  CSRF_COOKIE,
  getRefreshTokenFromRequest,
  getCsrfTokenFromRequest,
} from "./auth.util";
import { randomBytes } from "crypto";
import { ApiErrorResponses } from "../common/swagger/api-error.decorator";

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

function resolveAddress(body: { walletAddress?: string; address?: string }) {
  return body.walletAddress || body.address || "";
}

const AUTH_TTL_RAW = Number(process.env.THROTTLE_AUTH_TTL);
const AUTH_LIMIT_RAW = Number(process.env.THROTTLE_AUTH_LIMIT);
const AUTH_TTL_SECONDS = Number.isFinite(AUTH_TTL_RAW) && AUTH_TTL_RAW > 0 ? AUTH_TTL_RAW : 60;
const AUTH_TTL_MS = AUTH_TTL_SECONDS * 1000;
const AUTH_LIMIT = Number.isFinite(AUTH_LIMIT_RAW) && AUTH_LIMIT_RAW > 0 ? AUTH_LIMIT_RAW : 20;

@ApiTags("auth")
@ApiErrorResponses()
@Controller("auth")
/** Authentication endpoints for session lifecycle operations. */
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle({ default: { limit: AUTH_LIMIT, ttl: AUTH_TTL_MS } })
  @Post("nonce")
  @ApiOperation({ summary: "Request a login nonce" })
  async nonce(@Body() body: NonceRequestDto) {
    await validateOrReject(plainToInstance(NonceRequestDto, body));
    const address = resolveAddress(body);
    const { nonce, expiresAt } = await this.auth.issueNonce(address);
    return {
      address,
      nonce,
      expiresAt,
      message: this.auth.getLoginMessage(nonce),
    };
  }

  @Throttle({ default: { limit: AUTH_LIMIT, ttl: AUTH_TTL_MS } })
  @Post("login")
  @ApiOperation({ summary: "Login with wallet signature" })
  async login(@Body() body: LoginRequestDto, @Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    await validateOrReject(plainToInstance(LoginRequestDto, body));
    const address = resolveAddress(body);
    const result = await this.auth.login({
      address,
      signature: body.signature,
      context: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || null,
      },
    });
    res.cookie(ACCESS_COOKIE, result.accessToken, cookieOptions(true, this.auth.getAccessTokenTtlSeconds() * 1000));
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions(true, this.auth.getRefreshTokenMaxAgeMs()));
    res.cookie(CSRF_COOKIE, result.csrfToken, cookieOptions(false, this.auth.getRefreshTokenMaxAgeMs()));
    return {
      token: result.accessToken,
      user: result.user,
    };
  }

  @Throttle({ default: { limit: AUTH_LIMIT, ttl: AUTH_TTL_MS } })
  @Post("verify")
  @ApiOperation({ summary: "Verify wallet signature and login" })
  async verify(@Body() body: VerifyRequestDto, @Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    await validateOrReject(plainToInstance(VerifyRequestDto, body));
    const result = await this.auth.login({
      address: body.address,
      signature: body.signature,
      nonce: body.nonce,
      context: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || null,
      },
    });
    res.cookie(ACCESS_COOKIE, result.accessToken, cookieOptions(true, this.auth.getAccessTokenTtlSeconds() * 1000));
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions(true, this.auth.getRefreshTokenMaxAgeMs()));
    res.cookie(CSRF_COOKIE, result.csrfToken, cookieOptions(false, this.auth.getRefreshTokenMaxAgeMs()));
    return {
      token: result.accessToken,
      user: result.user,
    };
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh session tokens" })
  async refresh(@Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getRefreshTokenFromRequest(req);
    if (!refreshToken) {
      return { success: false, error: "REFRESH_TOKEN_MISSING" };
    }
    const result = await this.auth.refresh({
      refreshToken,
      context: {
        ip: req.ip,
        userAgent: req.headers["user-agent"] || null,
      },
    });
    res.cookie(ACCESS_COOKIE, result.accessToken, cookieOptions(true, this.auth.getAccessTokenTtlSeconds() * 1000));
    res.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions(true, this.auth.getRefreshTokenMaxAgeMs()));
    res.cookie(CSRF_COOKIE, result.csrfToken, cookieOptions(false, this.auth.getRefreshTokenMaxAgeMs()));
    return { user: result.user };
  }

  @Post("logout")
  @ApiOperation({ summary: "Logout and revoke refresh token" })
  async logout(@Request() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const refreshToken = getRefreshTokenFromRequest(req);
    await this.auth.logout(refreshToken);
    res.clearCookie(ACCESS_COOKIE, cookieOptions(true));
    res.clearCookie(REFRESH_COOKIE, cookieOptions(true));
    res.clearCookie(CSRF_COOKIE, cookieOptions(false));
    return { success: true };
  }

  @UseGuards(JwtGuard)
  @Get("me")
  @ApiBearerAuth("bearer")
  @ApiOperation({ summary: "Get current session user" })
  async me(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const user = await this.auth.me(req.user.sub);
    let csrfToken = getCsrfTokenFromRequest(req);
    if (!csrfToken) {
      csrfToken = randomBytes(16).toString("hex");
      res.cookie(CSRF_COOKIE, csrfToken, cookieOptions(false, this.auth.getRefreshTokenMaxAgeMs()));
    }
    return { ...user, csrfToken };
  }
}
