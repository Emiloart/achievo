import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { SocialModule } from "../social/social.module";
import { ValidationsController, ValidatorsController, UserValidationsController } from "./validations.controller";
import { ValidationsService } from "./validations.service";
import { ValidatorsService } from "./validators.service";
import { Eip712Service } from "./eip712.service";
import { ConsistencyModule } from "../consistency/consistency.module";
import { PrivacyModule } from "../privacy/privacy.module";
import { AnchoringModule } from "../anchoring/anchoring.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    SocialModule,
    ConsistencyModule,
    forwardRef(() => PrivacyModule),
    AnchoringModule,
  ],
  controllers: [ValidationsController, ValidatorsController, UserValidationsController],
  providers: [ValidationsService, ValidatorsService, Eip712Service],
  exports: [ValidationsService, Eip712Service],
})
export class ValidationsModule {}
