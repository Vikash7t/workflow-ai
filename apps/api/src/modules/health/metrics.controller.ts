import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
  Res,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from "@nestjs/swagger";
import { Response } from "express";
import { MetricsService } from "./metrics.service";
import { env } from "../../config/env.config";

@ApiTags("Observability")
@Controller("metrics")
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: "Prometheus metrics scrape endpoint" })
  @ApiResponse({ status: 200, description: "Prometheus text exposition format" })
  getMetrics(
    @Headers("authorization") authHeader: string | undefined,
    @Res() res: Response
  ) {
    // If a metrics token is configured in production, enforce Bearer authorization
    if (env.METRICS_BEARER_TOKEN) {
      const expected = `Bearer ${env.METRICS_BEARER_TOKEN}`;
      if (!authHeader || authHeader !== expected) {
        throw new UnauthorizedException("Invalid or missing Prometheus scrape token");
      }
    }

    const output = this.metricsService.formatPrometheusMetrics();
    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.send(output);
  }
}
