import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";
import { SprintsService } from "./sprints.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CreateSprintDto,
  UpdateSprintDto,
  CompleteSprintDto,
  SprintDto,
} from "@workflow-ai/contracts";

@ApiTags("Sprints")
@Controller("workspaces/:workspaceId")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard)
@ApiCookieAuth("better-auth.session_token")
@ApiBearerAuth()
export class SprintsController {
  constructor(private readonly sprintsService: SprintsService) {}

  @Post("projects/:projectId/sprints")
  @UseGuards(RolesGuard)
  @Roles("ADMIN", "OWNER")
  @ApiOperation({ summary: "Create a new planned sprint (Admin/Owner only)" })
  @ApiResponse({ status: 201, description: "Sprint created successfully" })
  async createSprint(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Body() data: CreateSprintDto
  ): Promise<SprintDto> {
    return this.sprintsService.createSprint(workspaceId, {
      ...data,
      projectId,
    });
  }

  @Get("projects/:projectId/sprints")
  @ApiOperation({ summary: "List sprints for a project" })
  @ApiResponse({ status: 200, description: "List of sprints" })
  async listSprints(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string
  ): Promise<SprintDto[]> {
    return this.sprintsService.listSprints(workspaceId, projectId);
  }

  @Patch("sprints/:sprintId")
  @UseGuards(RolesGuard)
  @Roles("ADMIN", "OWNER")
  @ApiOperation({ summary: "Update sprint details or activate sprint (Admin/Owner only)" })
  @ApiResponse({ status: 200, description: "Sprint updated successfully" })
  async updateSprint(
    @Param("workspaceId") workspaceId: string,
    @Param("sprintId") sprintId: string,
    @Body() data: UpdateSprintDto
  ): Promise<SprintDto> {
    return this.sprintsService.updateSprint(workspaceId, sprintId, data);
  }

  @Post("sprints/:sprintId/complete")
  @UseGuards(RolesGuard)
  @Roles("ADMIN", "OWNER")
  @ApiOperation({ summary: "Complete active sprint and roll over unfinished issues (Admin/Owner only)" })
  @ApiResponse({ status: 200, description: "Sprint completed with issues rolled over" })
  async completeSprint(
    @Param("workspaceId") workspaceId: string,
    @Param("sprintId") sprintId: string,
    @CurrentUser("id") userId: string,
    @Body() data: CompleteSprintDto
  ) {
    return this.sprintsService.completeSprint(
      workspaceId,
      sprintId,
      userId,
      data
    );
  }

  @Delete("sprints/:sprintId")
  @UseGuards(RolesGuard)
  @Roles("ADMIN", "OWNER")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete sprint and return issues to backlog (Admin/Owner only)" })
  @ApiResponse({ status: 204, description: "Sprint deleted successfully" })
  async deleteSprint(
    @Param("workspaceId") workspaceId: string,
    @Param("sprintId") sprintId: string
  ): Promise<void> {
    return this.sprintsService.deleteSprint(workspaceId, sprintId);
  }
}
