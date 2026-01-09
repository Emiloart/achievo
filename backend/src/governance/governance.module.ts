import { Module } from "@nestjs/common";
import { AnchoringModule } from "../anchoring/anchoring.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { GovernanceSanityCheckService } from "./governance.service";

@Module({
  imports: [AnchoringModule, OrganizationsModule],
  providers: [GovernanceSanityCheckService],
})
export class GovernanceModule {}
