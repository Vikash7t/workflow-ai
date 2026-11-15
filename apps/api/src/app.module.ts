import { Module } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
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
import { CopilotModule } from "./modules/copilot/copilot.module";
import { SearchModule } from "./modules/search/search.module";
import { IntelligenceModule } from "./modules/intelligence/intelligence.module";
import { ExternalIngestionModule } from "./modules/ingestion/ingestion.module";
import { PrismaService } from "./database/prisma.service";
import { RateLimitGuard } from "./common/guards/rate-limit.guard";
import { MetricsInterceptor } from "./modules/health/metrics.interceptor";

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
    CopilotModule,
    SearchModule,
    IntelligenceModule,
    ExternalIngestionModule,
  ],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
