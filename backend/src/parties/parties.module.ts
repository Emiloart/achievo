import { Module } from "@nestjs/common";
import { PartiesController } from "./parties.controller";
import { PartiesService } from "./parties.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { SocialModule } from "../social/social.module";
import { QuestsModule } from "../quests/quests.module";

@Module({
  imports: [PrismaModule, AuthModule, SocialModule, QuestsModule],
  controllers: [PartiesController],
  providers: [PartiesService],
  exports: [PartiesService],
})
export class PartiesModule {}
