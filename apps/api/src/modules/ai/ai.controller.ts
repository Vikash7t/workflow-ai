import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AiService } from "./ai.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  DecomposeTaskRequestSchema,
  CommitAiActionSchema,
  AiActionDto,
} from "@workflow-ai/contracts";

@Controller("workspaces/:workspaceId/ai")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard, RolesGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("decompose")
  @Roles("OWNER", "ADMIN", "MEMBER")
  async decompose(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: any,
    @Body() body: unknown
  ): Promise<AiActionDto> {
    const parseResult = DecomposeTaskRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: "Invalid AI decomposition request",
        errors: parseResult.error.format(),
      });
    }

    return this.aiService.decomposeTasks(workspaceId, user.id, parseResult.data);
  }

  @Get("actions/:actionId")
  @Roles("OWNER", "ADMIN", "MEMBER", "VIEWER")
  async getAction(
    @Param("workspaceId") workspaceId: string,
    @Param("actionId") actionId: string
  ): Promise<AiActionDto> {
    return this.aiService.getAction(workspaceId, actionId);
  }

  @Post("actions/:actionId/commit")
  @Roles("OWNER", "ADMIN", "MEMBER")
  async commitAction(
    @Param("workspaceId") workspaceId: string,
    @Param("actionId") actionId: string,
    @CurrentUser() user: any,
    @Body() body: unknown
  ): Promise<{
    createdCount: number;
    epicId: string;
    epicKey: string;
    issueKeys: string[];
  }> {
    const parseResult = CommitAiActionSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: "Invalid AI action commit payload",
        errors: parseResult.error.format(),
      });
    }

    return this.aiService.commitAction(
      workspaceId,
      user.id,
      actionId,
      parseResult.data
    );
  }
}
