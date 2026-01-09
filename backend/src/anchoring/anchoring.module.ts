import { Global, Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AnchoringService } from "./anchoring.service";
import { AnchoringQueueService } from "./anchoring.queue.service";
import { ChainActionsModule } from "../chain-actions/chain-actions.module";

@Global()
@Module({
  imports: [PrismaModule, ChainActionsModule],
  providers: [AnchoringService, AnchoringQueueService],
  exports: [AnchoringService, AnchoringQueueService],
})
export class AnchoringModule {}
