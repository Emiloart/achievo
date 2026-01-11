import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminAuthModule } from "../admin-auth/admin-auth.module";
import { AdminAuditModule } from "../admin-audit/admin-audit.module";
import { AdminToolsModule } from "../admin-tools/admin-tools.module";
import { ChainActionsModule } from "../chain-actions/chain-actions.module";
import { HealthModule } from "../health/health.module";
import { AnchoringModule } from "../anchoring/anchoring.module";
import { AdminGatewayController } from "./admin-gateway.controller";
import { AdminGatewayService } from "./admin-gateway.service";
import { AdminIntentService } from "./admin-intent.service";

@Module({
  imports: [
    PrismaModule,
    AdminAuthModule,
    AdminAuditModule,
    AdminToolsModule,
    ChainActionsModule,
    HealthModule,
    AnchoringModule,
  ],
  controllers: [AdminGatewayController],
  providers: [AdminGatewayService, AdminIntentService],
})
export class AdminGatewayModule {}
