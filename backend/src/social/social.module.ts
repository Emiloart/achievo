import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AchievoModule } from "../achievo/achievo.module";
import { PartyFeedService } from "./partyFeed.service";
import { SocialIdentityService } from "./socialIdentity.service";

@Module({
  imports: [PrismaModule, forwardRef(() => AchievoModule)],
  providers: [PartyFeedService, SocialIdentityService],
  exports: [PartyFeedService, SocialIdentityService],
})
export class SocialModule {}
