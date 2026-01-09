import { Module } from "@nestjs/common";
import { IdentityController } from "./identity.controller";
import { AchievoModule } from "../achievo/achievo.module";
import { QuestsModule } from "../quests/quests.module";
import { AuthModule } from "../auth/auth.module";
import { SocialModule } from "../social/social.module";

@Module({
  imports: [AchievoModule, QuestsModule, AuthModule, SocialModule],
  controllers: [IdentityController],
})
export class IdentityModule {}
