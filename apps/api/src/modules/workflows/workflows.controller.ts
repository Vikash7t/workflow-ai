import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";
import { WorkflowsService } from "./workflows.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CreateWorkflowStatusDto,
  UpdateWorkflowStatusDto,
  WorkflowStatusDto,
} from "@workflow-ai/contracts";

@ApiTags("Workflows")
@Controller("workspaces/:workspaceId/workflows/statuses")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard)
@ApiCookieAuth("better-auth.session_token")
@ApiBearerAuth()
export class WorkflowsController {
  constructor(private readonly workflowsService: WorkflowsService) {}

  @Get()
  @ApiOperation({ summary: "List all workflow statuses in the workspace" })
  @ApiResponse({ status: 200, description: "List of workflow statuses" })
  async list(@Param("workspaceId") workspaceId: string): Promise<WorkflowStatusDto[]> {
    return this.workflowsService.listStatuses(workspaceId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Create a new workflow status column (Admin required)" })
  @ApiResponse({ status: 201, description: "Status created" })
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body() dto: CreateWorkflowStatusDto
  ): Promise<WorkflowStatusDto> {
    return this.workflowsService.createStatus(workspaceId, dto);
  }

  @Patch(":statusId")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update a workflow status column (Admin required)" })
  @ApiResponse({ status: 200, description: "Status updated" })
  async update(
    @Param("workspaceId") workspaceId: string,
    @Param("statusId") statusId: string,
    @Body() dto: UpdateWorkflowStatusDto
  ): Promise<WorkflowStatusDto> {
    return this.workflowsService.updateStatus(workspaceId, statusId, dto);
  }

  @Put("reorder")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Reorder workflow status positions (Admin required)" })
  @ApiResponse({ status: 200, description: "Reordered statuses" })
  async reorder(
    @Param("workspaceId") workspaceId: string,
    @Body() body: { statusIds: string[] }
  ): Promise<WorkflowStatusDto[]> {
    return this.workflowsService.reorderStatuses(workspaceId, body.statusIds);
  }

  @Delete(":statusId")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Delete an empty workflow status column (Admin required)" })
  @ApiResponse({ status: 200, description: "Status deleted" })
  async delete(
    @Param("workspaceId") workspaceId: string,
    @Param("statusId") statusId: string
  ): Promise<{ success: boolean }> {
    return this.workflowsService.deleteStatus(workspaceId, statusId);
  }
}
