import { Module } from "@nestjs/common";
import { GoalsController } from "./goals.controller";

@Module({
  controllers: [GoalsController],
})
export class GoalsModule {}
