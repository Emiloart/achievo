/**
 * Admin session guard.
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import { getAccessTokenFromRequest } from "./cookies.util";

@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    const token = getAccessTokenFromRequest(req);
    if (!token) throw new UnauthorizedException("ADMIN_ACCESS_TOKEN_MISSING");
    let decoded: any;
    try {
      decoded = this.jwt.verify(token);
    } catch {
      throw new UnauthorizedException("ADMIN_ACCESS_TOKEN_INVALID");
    }
    const admin = await this.prisma.adminUser.findUnique({ where: { id: decoded.sub } });
    if (!admin || !admin.isActive) {
      throw new UnauthorizedException("ADMIN_SESSION_INVALID");
    }
    if (admin.lockedUntil && admin.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException("ADMIN_SESSION_LOCKED");
    }
    (req as any).admin = {
      sub: decoded.sub,
      email: decoded.email,
      role: decoded.role,
      sessionId: decoded.sid,
    };
    return true;
  }
}
