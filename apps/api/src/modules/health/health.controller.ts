import { Controller, Get, Res, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { Response } from "express";
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
  @ApiResponse({ status: 503, description: "API is degraded / database unreachable" })
  async getReadiness(
    @Res({ passthrough: true }) res: Response
  ): Promise<HealthStatusDto> {
    const health = await this.healthService.checkHealth();
    if (health.status !== "ok") {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return health;
  }
}
