import { Module } from "@nestjs/common";
import { GitIntegrationsController } from "./git-integrations.controller";
import { WebhooksController } from "./webhooks.controller";
import { GitIntegrationsService } from "./git-integrations.service";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [GitIntegrationsController, WebhooksController],
  providers: [GitIntegrationsService, PrismaService],
  exports: [GitIntegrationsService],
})
export class IntegrationsModule {}
