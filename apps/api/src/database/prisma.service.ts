import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "../config/env.config";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private pool: Pool;

  constructor() {
    const pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 20, // Max 20 pooled connections
      idleTimeoutMillis: 30000, // Close idle connections after 30s
      connectionTimeoutMillis: 5000, // Connection acquisition timeout 5s
    });
    const adapter = new PrismaPg(pool);
    super({ adapter });
    this.pool = pool;
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("✅ Successfully connected to PostgreSQL via Prisma & pg.Pool");
    } catch (error) {
      this.logger.error("❌ Failed to connect to PostgreSQL:", error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await this.pool.end();
    this.logger.log("Prisma disconnected and connection pool terminated");
  }

  /**
   * Health probe with strict timeout to prevent connection pool starvation.
   */
  async isHealthy(timeoutMs = 2000): Promise<boolean> {
    try {
      const probePromise = this.$queryRaw`SELECT 1`;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Database probe timed out")), timeoutMs)
      );
      await Promise.race([probePromise, timeoutPromise]);
      return true;
    } catch {
      return false;
    }
  }
}
