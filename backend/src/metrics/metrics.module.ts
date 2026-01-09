import { Global, Module } from "@nestjs/common";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";
import { AdminAuthModule } from "../security/adminAuth/admin-auth.module";

@Global()
@Module({
  imports: [AdminAuthModule],
  providers: [MetricsService],
  controllers: [MetricsController],
  exports: [MetricsService],
})
export class MetricsModule {}
