/**
 * Organization RBAC guard.
 *
 * Security boundary: ensures the caller is a member with a required role before mutations.
 */
import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { OrgRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ORG_ROLES_KEY } from "./org-rbac.decorator";

@Injectable()
/** Enforces organization membership and role requirements for protected routes. */
export class OrgGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  private resolveOrgId(request: any) {
    return request?.params?.orgId || request?.params?.id || request?.body?.orgId || null;
  }

  private async resolveAchusrId(request: any) {
    const user = request?.user;
    const sub = user?.sub;
    if (!sub) return null;
    const record = await this.prisma.user.findUnique({ where: { id: sub }, select: { userId: true } });
    return record?.userId || null;
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<any>();
    const orgId = this.resolveOrgId(request);
    if (!orgId) throw new BadRequestException("ORG_ID_REQUIRED");
    const achusrId = await this.resolveAchusrId(request);
    if (!achusrId) throw new UnauthorizedException("NOT_AUTHENTICATED");
    const membership = await this.prisma.orgMember.findUnique({
      where: { orgId_userId: { orgId: String(orgId), userId: achusrId } },
    });
    if (!membership) throw new ForbiddenException("NOT_MEMBER");
    const roles = this.reflector.getAllAndOverride<OrgRole[]>(ORG_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && roles.length && !roles.includes(membership.role)) {
      throw new ForbiddenException("INSUFFICIENT_ROLE");
    }
    request.orgMember = membership;
    request.achusrId = achusrId;
    return true;
  }
}
