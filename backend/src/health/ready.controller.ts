/**
 * Readiness endpoint.
 *
 * Indicates whether the service can serve traffic with required dependencies.
 */
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller()
/** Readiness probe endpoint for deployment health checks. */
export class ReadyController {
  constructor(private readonly health: HealthService) {}

  @Get("ready")
  @ApiOperation({ summary: "Readiness probe" })
  async ready() {
    return this.health.getReadiness();
  }
}
