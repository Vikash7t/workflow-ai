import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenancyModule } from "./modules/tenancy/tenancy.module";
import { PrismaService } from "./database/prisma.service";

@Module({
  imports: [HealthModule, AuthModule, TenancyModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
