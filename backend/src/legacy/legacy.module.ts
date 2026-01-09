import { Module } from "@nestjs/common";
import { AchievoModule } from "../achievo/achievo.module";
import { LegacyController } from "./legacy.controller";

@Module({
  imports: [AchievoModule],
  controllers: [LegacyController],
})
export class LegacyModule {}
