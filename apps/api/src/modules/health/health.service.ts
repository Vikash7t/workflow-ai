import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { HealthStatusDto } from "@workflow-ai/contracts";

interface CachedHealthCheck {
  result: HealthStatusDto;
  expiresAt: number;
}

@Injectable()
export class HealthService {
  private readonly startTime = Date.now();
  private cachedCheck: CachedHealthCheck | null = null;
  private readonly cacheTtlMs = 5000; // 5-second probe cache

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Clears the probe cache (used in tests for deterministic verification).
   */
  public clearCache(): void {
    this.cachedCheck = null;
  }

  async checkHealth(forceRefresh = false): Promise<HealthStatusDto> {
    const now = Date.now();
    if (!forceRefresh && this.cachedCheck && this.cachedCheck.expiresAt > now) {
      return this.cachedCheck.result;
    }

    const isDbHealthy = await this.prisma.isHealthy(2000);
    const uptimeSeconds = Math.floor((now - this.startTime) / 1000);
    const mem = process.memoryUsage();

    const result: HealthStatusDto = {
      status: isDbHealthy ? "ok" : "degraded",
      service: "@workflow-ai/api",
      version: "0.1.0",
      uptimeSeconds,
      timestamp: new Date().toISOString(),
      checks: {
        database: isDbHealthy ? "up" : "down",
        heapUsedMb: Math.round(mem.heapUsed / 1024 / 1024),
      } as any,
    };

    this.cachedCheck = {
      result,
      expiresAt: now + this.cacheTtlMs,
    };

    return result;
  }
}
