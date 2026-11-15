import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";
import { DependenciesService } from "./dependencies.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CreateDependencyDto } from "@workflow-ai/contracts";

@ApiTags("Dependencies")
@Controller("workspaces/:workspaceId")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard)
@ApiCookieAuth("better-auth.session_token")
@ApiBearerAuth()
export class DependenciesController {
  constructor(private readonly dependenciesService: DependenciesService) {}

  @Post("issues/:issueId/dependencies")
  @ApiOperation({ summary: "Add a dependency to an issue with cycle prevention" })
  @ApiResponse({ status: 201, description: "Dependency added successfully" })
  async addDependency(
    @Param("workspaceId") workspaceId: string,
    @Param("issueId") issueId: string,
    @CurrentUser("id") userId: string,
    @Body() data: CreateDependencyDto
  ) {
    return this.dependenciesService.addDependency(
      workspaceId,
      issueId,
      userId,
      data
    );
  }

  @Get("issues/:issueId/dependencies")
  @ApiOperation({ summary: "List incoming and outgoing dependencies for an issue" })
  @ApiResponse({ status: 200, description: "Dependencies list" })
  async listDependencies(
    @Param("workspaceId") workspaceId: string,
    @Param("issueId") issueId: string
  ) {
    return this.dependenciesService.listDependencies(workspaceId, issueId);
  }

  @Delete("dependencies/:dependencyId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove an issue dependency" })
  @ApiResponse({ status: 204, description: "Dependency removed successfully" })
  async removeDependency(
    @Param("workspaceId") workspaceId: string,
    @Param("dependencyId") dependencyId: string,
    @CurrentUser("id") userId: string
  ): Promise<void> {
    return this.dependenciesService.removeDependency(
      workspaceId,
      dependencyId,
      userId
    );
  }
}
