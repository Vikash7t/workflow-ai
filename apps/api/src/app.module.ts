import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { PrismaService } from "./database/prisma.service";

@Module({
  imports: [HealthModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
