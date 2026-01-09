import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdminAuthModule } from "../security/adminAuth/admin-auth.module";
import { ChainActionsService } from "./chain-actions.service";
import { ChainActionsWorker } from "./chain-actions.worker";
import { ChainActionsController } from "./chain-actions.controller";

@Module({
  imports: [PrismaModule, AdminAuthModule],
  providers: [ChainActionsService, ChainActionsWorker],
  controllers: [ChainActionsController],
  exports: [ChainActionsService],
})
export class ChainActionsModule {}
