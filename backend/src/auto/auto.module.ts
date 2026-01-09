import { Module } from "@nestjs/common";
import { AutoController } from "./auto.controller";

@Module({
  controllers: [AutoController],
})
export class AutoModule {}
