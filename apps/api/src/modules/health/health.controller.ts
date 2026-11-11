import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { HealthService } from "./health.service";
import { HealthStatusDto } from "@workflow-ai/contracts";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get("live")
  @ApiOperation({ summary: "Liveness probe" })
  @ApiResponse({ status: 200, description: "API process is alive" })
  getLiveness() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  @Get("ready")
  @ApiOperation({ summary: "Readiness probe with database connectivity check" })
  @ApiResponse({ status: 200, description: "API and database are ready" })
  async getReadiness(): Promise<HealthStatusDto> {
    return this.healthService.checkHealth();
  }
}
