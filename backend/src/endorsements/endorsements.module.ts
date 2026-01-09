import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { ConsistencyModule } from "../consistency/consistency.module";
import { RiskModule } from "../risk/risk.module";
import { PrivacyModule } from "../privacy/privacy.module";
import { EndorsementWeightService } from "./endorsementWeight.service";
import { EndorsementsService } from "./endorsements.service";
import {
  EndorsementsController,
  SkillsController,
  UserEndorsementsController,
  UserSkillsController,
} from "./endorsements.controller";

@Module({
  imports: [PrismaModule, AuthModule, ConsistencyModule, RiskModule, PrivacyModule],
  controllers: [EndorsementsController, SkillsController, UserSkillsController, UserEndorsementsController],
  providers: [EndorsementWeightService, EndorsementsService],
  exports: [EndorsementsService],
})
export class EndorsementsModule {}
