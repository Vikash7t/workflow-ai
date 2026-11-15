import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { CopilotService } from "./copilot.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CopilotChatRequestSchema,
  CopilotResponseDto,
} from "@workflow-ai/contracts";

@Controller("workspaces/:workspaceId/copilot")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard, RolesGuard)
export class CopilotController {
  constructor(private readonly copilotService: CopilotService) {}

  @Post("chat")
  @Roles("OWNER", "ADMIN", "MEMBER", "VIEWER")
  async chat(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser() user: any,
    @Body() body: unknown
  ): Promise<CopilotResponseDto> {
    const parseResult = CopilotChatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: "Invalid Copilot chat request",
        errors: parseResult.error.format(),
      });
    }

    return this.copilotService.chat(workspaceId, user.id, parseResult.data);
  }

  @Post("actions/:actionId/commit")
  @Roles("OWNER", "ADMIN", "MEMBER")
  async commitAction(
    @Param("workspaceId") workspaceId: string,
    @Param("actionId") actionId: string,
    @CurrentUser() user: any
  ): Promise<{ success: boolean; message: string; issueKey: string }> {
    return this.copilotService.commitAction(workspaceId, user.id, actionId);
  }
}
