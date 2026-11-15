import { Module } from "@nestjs/common";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";
import { PrismaService } from "../../database/prisma.service";
import { ActivitiesModule } from "../activities/activities.module";

@Module({
  imports: [ActivitiesModule],
  controllers: [CommentsController],
  providers: [CommentsService, PrismaService],
  exports: [CommentsService],
})
export class CommentsModule {}
