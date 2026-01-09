import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OrgSubmissionsService } from "./org-submissions.service";
import { OrgSubmissionsController } from "./org-submissions.controller";
import { OrgAuditModule } from "../org-audit/org-audit.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PrivacyModule } from "../privacy/privacy.module";
import { ConsistencyModule } from "../consistency/consistency.module";
import { ValidationsModule } from "../validations/validations.module";
import { OrgRbacModule } from "../org-rbac/org-rbac.module";
import { SocialModule } from "../social/social.module";
import { AnchoringModule } from "../anchoring/anchoring.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [
    PrismaModule,
    OrgAuditModule,
    OrganizationsModule,
    PrivacyModule,
    ConsistencyModule,
    ValidationsModule,
    OrgRbacModule,
    SocialModule,
    AnchoringModule,
    AuthModule,
  ],
  providers: [OrgSubmissionsService],
  controllers: [OrgSubmissionsController],
  exports: [OrgSubmissionsService],
})
export class OrgSubmissionsModule {}
