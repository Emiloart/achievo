import { Module } from "@nestjs/common";
import { InvoicesPublicController, ProjectsController } from "./projects.controller";
import { ProjectsService } from "./projects.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { SocialModule } from "../social/social.module";
import { QuestsModule } from "../quests/quests.module";
import { AchievoModule } from "../achievo/achievo.module";

@Module({
  imports: [PrismaModule, AuthModule, SocialModule, QuestsModule, AchievoModule],
  controllers: [ProjectsController, InvoicesPublicController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
