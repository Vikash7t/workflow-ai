import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";
import { ProjectsService } from "./projects.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CreateProjectDto, UpdateProjectDto, ProjectDto } from "@workflow-ai/contracts";

@ApiTags("Projects")
@Controller("workspaces/:workspaceId/projects")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard)
@ApiCookieAuth("better-auth.session_token")
@ApiBearerAuth()
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles("MEMBER")
  @ApiOperation({ summary: "Create a new project in the workspace" })
  @ApiResponse({ status: 201, description: "Project created" })
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body() dto: CreateProjectDto
  ): Promise<ProjectDto> {
    return this.projectsService.create(workspaceId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List all projects in the workspace" })
  @ApiResponse({ status: 200, description: "List of projects" })
  async list(@Param("workspaceId") workspaceId: string): Promise<ProjectDto[]> {
    return this.projectsService.list(workspaceId);
  }

  @Get(":projectId")
  @ApiOperation({ summary: "Get project details by ID" })
  @ApiResponse({ status: 200, description: "Project details" })
  async getById(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string
  ): Promise<ProjectDto> {
    return this.projectsService.getById(workspaceId, projectId);
  }

  @Patch(":projectId")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update project settings (Admin required)" })
  @ApiResponse({ status: 200, description: "Updated project" })
  async update(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Body() dto: UpdateProjectDto
  ): Promise<ProjectDto> {
    return this.projectsService.update(workspaceId, projectId, dto);
  }

  @Delete(":projectId")
  @UseGuards(RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Delete a project (Admin required)" })
  @ApiResponse({ status: 200, description: "Project deleted" })
  async delete(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string
  ): Promise<{ success: boolean }> {
    return this.projectsService.delete(workspaceId, projectId);
  }
}
