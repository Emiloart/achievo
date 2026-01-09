import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { IndexerService } from "./indexer.service";

@Module({
  imports: [PrismaModule],
  providers: [IndexerService],
  exports: [IndexerService],
})
export class IndexerModule {}
