import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { GitIntegrationsService } from "./git-integrations.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CreateGitIntegrationSchema,
  UpdateGitIntegrationSchema,
  GitIntegrationDto,
  CreatedGitIntegrationDto,
} from "@workflow-ai/contracts";

@Controller("workspaces/:workspaceId/integrations/git")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard, RolesGuard)
export class GitIntegrationsController {
  constructor(private readonly service: GitIntegrationsService) {}

  @Post()
  @Roles("OWNER", "ADMIN")
  async create(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown
  ): Promise<CreatedGitIntegrationDto> {
    const parseResult = CreateGitIntegrationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: "Invalid Git integration payload",
        errors: parseResult.error.format(),
      });
    }

    return this.service.createIntegration(workspaceId, parseResult.data);
  }

  @Get()
  @Roles("OWNER", "ADMIN", "MEMBER")
  async list(
    @Param("workspaceId") workspaceId: string,
    @Query("projectId") projectId?: string
  ): Promise<GitIntegrationDto[]> {
    return this.service.listIntegrations(workspaceId, projectId);
  }

  @Patch(":integrationId")
  @Roles("OWNER", "ADMIN")
  async update(
    @Param("workspaceId") workspaceId: string,
    @Param("integrationId") integrationId: string,
    @Body() body: unknown
  ): Promise<GitIntegrationDto> {
    const parseResult = UpdateGitIntegrationSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: "Invalid Git integration update payload",
        errors: parseResult.error.format(),
      });
    }

    return this.service.updateIntegration(
      workspaceId,
      integrationId,
      parseResult.data
    );
  }

  @Delete(":integrationId")
  @Roles("OWNER", "ADMIN")
  async delete(
    @Param("workspaceId") workspaceId: string,
    @Param("integrationId") integrationId: string
  ): Promise<{ success: boolean }> {
    return this.service.deleteIntegration(workspaceId, integrationId);
  }
}
