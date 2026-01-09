import { Module } from "@nestjs/common";
import { LeaderboardController } from "./leaderboard.controller";
import { LeaderboardService } from "./leaderboard.service";
import { PrismaModule } from "../prisma/prisma.module";
import { QuestsModule } from "../quests/quests.module";
import { SocialModule } from "../social/social.module";

@Module({
  imports: [PrismaModule, QuestsModule, SocialModule],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
})
export class LeaderboardModule {}
