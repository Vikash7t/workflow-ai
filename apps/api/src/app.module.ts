import { Module } from "@nestjs/common";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { TenancyModule } from "./modules/tenancy/tenancy.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { WorkflowsModule } from "./modules/workflows/workflows.module";
import { IssuesModule } from "./modules/issues/issues.module";
import { ActivitiesModule } from "./modules/activities/activities.module";
import { CommentsModule } from "./modules/comments/comments.module";
import { DependenciesModule } from "./modules/dependencies/dependencies.module";
import { SprintsModule } from "./modules/sprints/sprints.module";
import { AiModule } from "./modules/ai/ai.module";
import { IntegrationsModule } from "./modules/integrations/integrations.module";
import { PrismaService } from "./database/prisma.service";

@Module({
  imports: [
    HealthModule,
    AuthModule,
    TenancyModule,
    ProjectsModule,
    WorkflowsModule,
    IssuesModule,
    ActivitiesModule,
    CommentsModule,
    DependenciesModule,
    SprintsModule,
    AiModule,
    IntegrationsModule,
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
