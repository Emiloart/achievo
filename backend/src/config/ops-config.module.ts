import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { AnchoringModule } from "../anchoring/anchoring.module";
import { OpsConfigService } from "./ops-config.service";

@Module({
  imports: [PrismaModule, OrganizationsModule, AnchoringModule],
  providers: [OpsConfigService],
})
export class OpsConfigModule {}
