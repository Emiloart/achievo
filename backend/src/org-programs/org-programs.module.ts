import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OrgProgramsService } from "./org-programs.service";
import { OrgProgramsController } from "./org-programs.controller";
import { OrgAuditModule } from "../org-audit/org-audit.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { OrgRbacModule } from "../org-rbac/org-rbac.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [PrismaModule, OrgAuditModule, OrganizationsModule, OrgRbacModule, AuthModule],
  providers: [OrgProgramsService],
  controllers: [OrgProgramsController],
  exports: [OrgProgramsService],
})
export class OrgProgramsModule {}
