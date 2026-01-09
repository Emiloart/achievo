import { Module } from "@nestjs/common";
import { AchievoController } from "./achievo.controller";
import { OnchainServiceV11 } from "../blockchain/onchainServiceV11";
import { AchievoDataService } from "../blockchain/achievoData.service";
import { UsernameRegistryService } from "../blockchain/usernameRegistry.service";
import { ConfigModule } from "@nestjs/config";
import { AuthModule } from "../auth/auth.module";
import { PrivacyModule } from "../privacy/privacy.module";

@Module({
  imports: [ConfigModule, AuthModule, PrivacyModule],
  controllers: [AchievoController],
  providers: [OnchainServiceV11, AchievoDataService, UsernameRegistryService],
  exports: [OnchainServiceV11, AchievoDataService, UsernameRegistryService],
})
export class AchievoModule {}
