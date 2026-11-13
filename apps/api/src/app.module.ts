import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenancyModule } from "./modules/tenancy/tenancy.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";
import { IssuesModule } from "./modules/issues/issues.module";
import { PrismaService } from "./database/prisma.service";

@Module({
  imports: [
    HealthModule,
    AuthModule,
    TenancyModule,
    ProjectsModule,
    WorkflowsModule,
    IssuesModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
