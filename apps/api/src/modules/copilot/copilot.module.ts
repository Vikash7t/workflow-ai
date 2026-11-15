import { Module } from "@nestjs/common";
import { CopilotController } from "./copilot.controller";
import { CopilotService } from "./copilot.service";
import { PrismaService } from "../../database/prisma.service";

@Module({
  controllers: [CopilotController],
  providers: [CopilotService, PrismaService],
  exports: [CopilotService],
})
export class CopilotModule {}
