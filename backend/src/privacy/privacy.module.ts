import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { PrivacyPolicyService } from "./privacy.service";
import { PrivacyController } from "./privacy.controller";
import { ProofsModule } from "../proofs/proofs.module";
import { ValidationsModule } from "../validations/validations.module";
import { ProfileExportsModule } from "../profile-exports/profileExports.module";

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    forwardRef(() => ProofsModule),
    forwardRef(() => ValidationsModule),
    forwardRef(() => ProfileExportsModule),
  ],
  controllers: [PrivacyController],
  providers: [PrivacyPolicyService],
  exports: [PrivacyPolicyService],
})
export class PrivacyModule {}
