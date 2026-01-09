/**
 * JWT guard for authenticated API access.
 *
 * Security boundary: rejects requests without a valid access token and attaches the decoded user context.
 */
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { getAccessTokenFromRequest } from "./auth.util";

@Injectable()
/** Validates bearer access tokens and attaches decoded claims to the request. */
export class JwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const token = getAccessTokenFromRequest(request);
    if (!token) throw new UnauthorizedException("Missing access token");
    try {
      const decoded = this.jwtService.verify(token);
      (request as any).user = decoded;
      return true;
    } catch (err) {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
