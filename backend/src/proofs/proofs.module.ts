import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { ProofsController, UserProofsController } from "./proofs.controller";
import { ProofsService } from "./proofs.service";
import { ProofHashService } from "./proofHash.service";
import { StorageService } from "./storage.service";
import { ConsistencyModule } from "../consistency/consistency.module";
import { PrivacyModule } from "../privacy/privacy.module";
import { AnchoringModule } from "../anchoring/anchoring.module";

@Module({
  imports: [PrismaModule, AuthModule, ConsistencyModule, forwardRef(() => PrivacyModule), AnchoringModule],
  controllers: [ProofsController, UserProofsController],
  providers: [ProofsService, ProofHashService, StorageService],
  exports: [ProofsService],
})
export class ProofsModule {}
