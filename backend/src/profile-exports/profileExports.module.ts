import { Module, forwardRef } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { Web3Module } from "../web3/web3.module";
import { ProfileExportsController, UserExportsController } from "./profileExports.controller";
import { ProfileExportsService } from "./profileExports.service";
import { ProfileSnapshotService } from "./profileSnapshot.service";
import { ProfileExportSignerService } from "./profileExportSigner.service";
import { ProfileExportStorageService } from "./profileExportStorage.service";
import { ProfileExportPdfService } from "./profileExportPdf.service";
import { OnchainServiceV11 } from "../blockchain/onchainServiceV11";
import { PrivacyModule } from "../privacy/privacy.module";
import { AnchoringModule } from "../anchoring/anchoring.module";

@Module({
  imports: [PrismaModule, AuthModule, Web3Module, forwardRef(() => PrivacyModule), AnchoringModule],
  controllers: [ProfileExportsController, UserExportsController],
  providers: [
    ProfileExportsService,
    ProfileSnapshotService,
    ProfileExportSignerService,
    ProfileExportStorageService,
    ProfileExportPdfService,
    OnchainServiceV11,
  ],
  exports: [ProfileExportsService],
})
export class ProfileExportsModule {}
