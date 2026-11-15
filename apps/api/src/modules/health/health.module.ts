import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { MetricsController } from "./metrics.controller";
import { MetricsService } from "./metrics.service";
import { MetricsInterceptor } from "./metrics.interceptor";

@Module({
  controllers: [HealthController, MetricsController],
  providers: [HealthService, MetricsService, MetricsInterceptor],
  exports: [HealthService, MetricsService, MetricsInterceptor],
})
export class HealthModule {}
