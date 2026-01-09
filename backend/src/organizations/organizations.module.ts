import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OrganizationsService } from "./organizations.service";
import { OrganizationsController } from "./organizations.controller";
import { OrgInvitesController } from "./org-invites.controller";
import { SocialModule } from "../social/social.module";
import { OrgAuditModule } from "../org-audit/org-audit.module";
import { OrgRbacModule } from "../org-rbac/org-rbac.module";
import { AuthModule } from "../auth/auth.module";
import { OrgRegistryService } from "./orgRegistry.service";
import { ChainActionsModule } from "../chain-actions/chain-actions.module";

@Module({
  imports: [PrismaModule, SocialModule, OrgAuditModule, OrgRbacModule, AuthModule, ChainActionsModule],
  providers: [OrganizationsService, OrgRegistryService],
  controllers: [OrganizationsController, OrgInvitesController],
  exports: [OrganizationsService, OrgRegistryService],
})
export class OrganizationsModule {}
