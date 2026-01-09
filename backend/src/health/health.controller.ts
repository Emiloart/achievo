/**
 * Health probe endpoints.
 *
 * Intended for load balancers and operators to assess liveness and dependency health.
 */
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
/** Health probe endpoints for liveness and dependency checks. */
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: "Liveness probe" })
  ping() {
    return this.health.getLiveness();
  }

  @Get("chain")
  @ApiOperation({ summary: "Chain health" })
  async chain() {
    return this.health.getChainHealth();
  }

  @Get("indexer")
  @ApiOperation({ summary: "Indexer health" })
  async indexer() {
    return this.health.getIndexerHealth();
  }

  @Get("anchoring")
  @ApiOperation({ summary: "Anchoring health" })
  async anchoring() {
    return this.health.getAnchoringHealth();
  }
}
