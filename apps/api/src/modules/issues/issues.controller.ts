import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";
import { IssuesService } from "./issues.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CreateIssueDto,
  UpdateIssueDto,
  IssueFilterDto,
  IssueDto,
  BulkUpdateStatusDto,
  BulkUpdateAssigneeDto,
  BulkDeleteIssuesDto,
  PaginatedResult,
} from "@workflow-ai/contracts";

@ApiTags("Issues")
@Controller("workspaces/:workspaceId/issues")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard)
@ApiCookieAuth("better-auth.session_token")
@ApiBearerAuth()
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @ApiOperation({ summary: "Create a new issue with atomic sequential numbering (e.g. ENG-101)" })
  @ApiResponse({ status: 201, description: "Issue created" })
  async create(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: CreateIssueDto
  ): Promise<IssueDto> {
    return this.issuesService.create(workspaceId, userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List and filter issues with pagination" })
  @ApiResponse({ status: 200, description: "Paginated list of issues" })
  async list(
    @Param("workspaceId") workspaceId: string,
    @Query() filter: IssueFilterDto
  ): Promise<PaginatedResult<IssueDto>> {
    return this.issuesService.list(workspaceId, filter);
  }

  @Patch("bulk/status")
  @ApiOperation({ summary: "Bulk update status for multiple issues" })
  @ApiResponse({ status: 200, description: "Updated count" })
  async bulkUpdateStatus(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: BulkUpdateStatusDto
  ): Promise<{ updatedCount: number }> {
    return this.issuesService.bulkUpdateStatus(workspaceId, dto.issueIds, dto.statusId, userId);
  }

  @Patch("bulk/assignee")
  @ApiOperation({ summary: "Bulk update assignee for multiple issues" })
  @ApiResponse({ status: 200, description: "Updated count" })
  async bulkUpdateAssignee(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: BulkUpdateAssigneeDto
  ): Promise<{ updatedCount: number }> {
    return this.issuesService.bulkUpdateAssignee(workspaceId, dto.issueIds, dto.assigneeId, userId);
  }

  @Post("bulk/delete")
  @ApiOperation({ summary: "Bulk delete multiple issues" })
  @ApiResponse({ status: 200, description: "Deleted count" })
  async bulkDelete(
    @Param("workspaceId") workspaceId: string,
    @Body() dto: BulkDeleteIssuesDto
  ): Promise<{ deletedCount: number }> {
    return this.issuesService.bulkDelete(workspaceId, dto.issueIds);
  }

  @Get(":issueId")
  @ApiOperation({ summary: "Get issue details by ID" })
  @ApiResponse({ status: 200, description: "Issue details" })
  async getById(
    @Param("workspaceId") workspaceId: string,
    @Param("issueId") issueId: string
  ): Promise<IssueDto> {
    return this.issuesService.getById(workspaceId, issueId);
  }

  @Patch(":issueId")
  @ApiOperation({ summary: "Update an existing issue" })
  @ApiResponse({ status: 200, description: "Updated issue" })
  async update(
    @Param("workspaceId") workspaceId: string,
    @Param("issueId") issueId: string,
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateIssueDto
  ): Promise<IssueDto> {
    return this.issuesService.update(workspaceId, issueId, userId, dto);
  }

  @Delete(":issueId")
  @ApiOperation({ summary: "Delete an issue" })
  @ApiResponse({ status: 200, description: "Issue deleted" })
  async delete(
    @Param("workspaceId") workspaceId: string,
    @Param("issueId") issueId: string
  ): Promise<{ success: boolean }> {
    return this.issuesService.delete(workspaceId, issueId);
  }
}
