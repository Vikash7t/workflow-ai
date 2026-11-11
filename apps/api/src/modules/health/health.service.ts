import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { HealthStatusDto } from "@workflow-ai/contracts";

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async checkHealth(): Promise<HealthStatusDto> {
    const isDbHealthy = await this.prisma.isHealthy();
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: isDbHealthy ? "ok" : "degraded",
      service: "@workflow-ai/api",
      version: "0.1.0",
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      checks: {
        database: isDbHealthy ? "up" : "down",
      },
    };
  }
}
