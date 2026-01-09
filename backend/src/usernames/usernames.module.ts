import { Module } from "@nestjs/common";
import { UsernamesController } from "./usernames.controller";
import { AuthModule } from "../auth/auth.module";
import { RiskModule } from "../risk/risk.module";
import { ChainActionsModule } from "../chain-actions/chain-actions.module";
import { UsernamesMarketService } from "./usernames-market.service";
import { UsernamesChainService } from "./username-chain.service";
import { UsernameEip712Service } from "./username-eip712.service";

@Module({
  imports: [AuthModule, RiskModule, ChainActionsModule],
  controllers: [UsernamesController],
  providers: [UsernamesMarketService, UsernamesChainService, UsernameEip712Service],
  exports: [UsernamesChainService],
})
export class UsernamesModule {}
