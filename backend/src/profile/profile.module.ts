import { Module } from "@nestjs/common";
import { ProfileController } from "./profile.controller";
import { ProfessionalProfileController, ShareLinkPublicController } from "./professional.controller";
import { ProfessionalProfileService } from "./professional.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { Web3Module } from "../web3/web3.module";
import { AchievoModule } from "../achievo/achievo.module";
import { QuestsModule } from "../quests/quests.module";

@Module({
  imports: [PrismaModule, AuthModule, Web3Module, AchievoModule, QuestsModule],
  controllers: [ProfileController, ProfessionalProfileController, ShareLinkPublicController],
  providers: [ProfessionalProfileService],
})
export class ProfileModule {}
