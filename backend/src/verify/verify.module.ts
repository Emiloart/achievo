import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PrivacyModule } from "../privacy/privacy.module";
import { ProfileExportsModule } from "../profile-exports/profileExports.module";
import { VerifyController } from "./verify.controller";
import { VerifyService } from "./verify.service";
import { ChainVerifyService } from "./chainVerify.service";
import { ProofHashService } from "../proofs/proofHash.service";
import { Eip712Service } from "../validations/eip712.service";

@Module({
  imports: [PrismaModule, ProfileExportsModule, forwardRef(() => PrivacyModule)],
  controllers: [VerifyController],
  providers: [VerifyService, ChainVerifyService, ProofHashService, Eip712Service],
})
export class VerifyModule {}
