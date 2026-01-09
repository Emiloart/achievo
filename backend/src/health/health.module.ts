import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { ReadyController } from "./ready.controller";
import { HealthService } from "./health.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AnchoringModule } from "../anchoring/anchoring.module";

@Module({
  imports: [PrismaModule, AnchoringModule],
  controllers: [HealthController, ReadyController],
  providers: [HealthService],
})
export class HealthModule {}
