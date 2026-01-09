/**
 * Admin guard enforcing API key + HMAC request signing.
 *
 * Security boundary: only requests with valid admin credentials and nonces are allowed to proceed.
 */
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { AdminAuthService } from "./admin-auth.service";

@Injectable()
/** Validates signed admin requests before controller execution. */
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    await this.auth.verifyRequest(req);
    return true;
  }
}
