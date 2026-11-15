import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";
import { ActivitiesService } from "./activities.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { ActivityLogDto } from "@workflow-ai/contracts";

@ApiTags("Activities")
@Controller("workspaces/:workspaceId/issues/:issueId/activities")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard)
@ApiCookieAuth("better-auth.session_token")
@ApiBearerAuth()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: "Get chronological activity audit history for an issue" })
  @ApiResponse({ status: 200, description: "Activity history records" })
  async getActivities(
    @Param("workspaceId") workspaceId: string,
    @Param("issueId") issueId: string
  ): Promise<ActivityLogDto[]> {
    return this.activitiesService.getIssueActivities(workspaceId, issueId) as Promise<ActivityLogDto[]>;
  }
}
