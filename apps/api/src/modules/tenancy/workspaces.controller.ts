import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";
import { WorkspacesService } from "./workspaces.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentWorkspace } from "../../common/decorators/current-workspace.decorator";
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceDto,
  Role,
} from "@workflow-ai/contracts";

@ApiTags("Workspaces")
@Controller("workspaces")
@UseGuards(SessionAuthGuard)
@ApiCookieAuth("better-auth.session_token")
@ApiBearerAuth()
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new workspace under an organization" })
  @ApiResponse({ status: 201, description: "Workspace created" })
  async create(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateWorkspaceDto
  ): Promise<WorkspaceDto> {
    return this.workspacesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List all workspaces the authenticated user has access to" })
  @ApiResponse({ status: 200, description: "List of accessible workspaces" })
  async list(@CurrentUser("id") userId: string): Promise<WorkspaceDto[]> {
    return this.workspacesService.listForUser(userId);
  }

  @Get(":workspaceId")
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: "Get workspace details by ID" })
  @ApiResponse({ status: 200, description: "Workspace details" })
  async getById(
    @Param("workspaceId") workspaceId: string,
    @CurrentWorkspace("role") role: Role
  ): Promise<WorkspaceDto> {
    return this.workspacesService.getById(workspaceId, role);
  }

  @Patch(":workspaceId")
  @UseGuards(WorkspaceAccessGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update workspace settings (Workspace Admin required)" })
  @ApiResponse({ status: 200, description: "Updated workspace" })
  async update(
    @Param("workspaceId") workspaceId: string,
    @Body() dto: UpdateWorkspaceDto,
    @CurrentWorkspace("role") role: Role
  ): Promise<WorkspaceDto> {
    return this.workspacesService.update(workspaceId, dto, role);
  }
}
