import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AchievoModule } from "../achievo/achievo.module";
import { AuthModule } from "../auth/auth.module";
import { SocialModule } from "../social/social.module";
import { ConsistencyModule } from "../consistency/consistency.module";
import { QuestEngineService } from "./questEngine.service";
import { QuestsController } from "./quests.controller";

@Module({
  imports: [PrismaModule, AchievoModule, AuthModule, SocialModule, ConsistencyModule],
  controllers: [QuestsController],
  providers: [QuestEngineService],
  exports: [QuestEngineService],
})
export class QuestsModule {}
