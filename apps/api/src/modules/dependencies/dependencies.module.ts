import { Module } from "@nestjs/common";
import { DependenciesService } from "./dependencies.service";
import { DependenciesController } from "./dependencies.controller";
import { PrismaService } from "../../database/prisma.service";
import { ActivitiesModule } from "../activities/activities.module";

@Module({
  imports: [ActivitiesModule],
  controllers: [DependenciesController],
  providers: [DependenciesService, PrismaService],
  exports: [DependenciesService],
})
export class DependenciesModule {}
