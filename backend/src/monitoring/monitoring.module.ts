import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { MonitoringService } from "./monitoring.service";
import { MonitoringController } from "./monitoring.controller";
import { AdminAuthModule } from "../security/adminAuth/admin-auth.module";

@Module({
  imports: [PrismaModule, AdminAuthModule],
  providers: [MonitoringService],
  controllers: [MonitoringController],
})
export class MonitoringModule {}
