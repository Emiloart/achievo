import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { RiskModule } from "../risk/risk.module";
import { ActivityEventService } from "./activityEvent.service";
import { ConsistencyScoringService } from "./consistencyScoring.service";
import { ConsistencyController } from "./consistency.controller";
import { PrivacyModule } from "../privacy/privacy.module";

@Module({
  imports: [PrismaModule, AuthModule, RiskModule, forwardRef(() => PrivacyModule)],
  controllers: [ConsistencyController],
  providers: [ActivityEventService, ConsistencyScoringService],
  exports: [ActivityEventService, ConsistencyScoringService],
})
export class ConsistencyModule {}
