import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminAuthModule } from "../security/adminAuth/admin-auth.module";
import { AdminToolsController } from "./admin-tools.controller";
import { AdminToolsService } from "./admin-tools.service";
import { AdminAuditInterceptor } from "./admin-audit.interceptor";
import { ChainActionsModule } from "../chain-actions/chain-actions.module";
import { AnchoringModule } from "../anchoring/anchoring.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { IndexerModule } from "../indexer/indexer.module";
import { ValidationsModule } from "../validations/validations.module";

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
    ChainActionsModule,
    AnchoringModule,
    OrganizationsModule,
    IndexerModule,
    ValidationsModule,
  ],
  controllers: [AdminToolsController],
  providers: [AdminToolsService, AdminAuditInterceptor],
})
export class AdminToolsModule {}
