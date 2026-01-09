import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../auth/auth.module";
import { RiskEngineService } from "./riskEngine.service";
import { RiskController } from "./risk.controller";
import { AdminAuthModule } from "../security/adminAuth/admin-auth.module";

@Module({
  imports: [PrismaModule, AuthModule, AdminAuthModule],
  controllers: [RiskController],
  providers: [RiskEngineService],
  exports: [RiskEngineService],
})
export class RiskModule {}
