/**
 * Admin role guard and decorator.
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AdminRole } from "@prisma/client";

const ROLE_KEY = "admin_roles";

const ROLE_ORDER: Record<AdminRole, number> = {
  VIEWER: 0,
  OPERATOR: 1,
  ADMIN: 2,
  SUPERADMIN: 3,
};

export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ROLE_KEY, roles);

@Injectable()
export class AdminRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AdminRole[]>(ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const req = context.switchToHttp().getRequest<any>();
    const role = req?.admin?.role as AdminRole | undefined;
    if (!role) throw new ForbiddenException("ADMIN_ROLE_REQUIRED");
    const current = ROLE_ORDER[role] ?? -1;
    const min = Math.min(...required.map((entry) => ROLE_ORDER[entry] ?? 99));
    if (current < min) throw new ForbiddenException("ADMIN_ROLE_FORBIDDEN");
    return true;
  }
}
