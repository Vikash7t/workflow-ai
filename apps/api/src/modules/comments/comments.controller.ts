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
import { CommentsService } from "./comments.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CurrentWorkspace } from "../../common/decorators/current-workspace.decorator";
import {
  CreateCommentDto,
  UpdateCommentDto,
  CommentDto,
} from "@workflow-ai/contracts";

@ApiTags("Comments")
@Controller("workspaces/:workspaceId")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard)
@ApiCookieAuth("better-auth.session_token")
@ApiBearerAuth()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post("issues/:issueId/comments")
  @ApiOperation({ summary: "Create a new comment on an issue" })
  @ApiResponse({ status: 201, description: "Comment created successfully" })
  async createComment(
    @Param("workspaceId") workspaceId: string,
    @Param("issueId") issueId: string,
    @CurrentUser("id") userId: string,
    @Body() data: CreateCommentDto
  ): Promise<CommentDto> {
    return this.commentsService.createComment(
      workspaceId,
      issueId,
      userId,
      data
    );
  }

  @Get("issues/:issueId/comments")
  @ApiOperation({ summary: "List comments for an issue" })
  @ApiResponse({ status: 200, description: "List of comments" })
  async listComments(
    @Param("workspaceId") workspaceId: string,
    @Param("issueId") issueId: string
  ): Promise<CommentDto[]> {
    return this.commentsService.listComments(workspaceId, issueId);
  }

  @Patch("comments/:commentId")
  @ApiOperation({ summary: "Update a comment (Author or Admin)" })
  @ApiResponse({ status: 200, description: "Comment updated successfully" })
  async updateComment(
    @Param("workspaceId") workspaceId: string,
    @Param("commentId") commentId: string,
    @CurrentUser("id") userId: string,
    @CurrentWorkspace("role") role: string,
    @Body() data: UpdateCommentDto
  ): Promise<CommentDto> {
    return this.commentsService.updateComment(
      workspaceId,
      commentId,
      userId,
      role,
      data
    );
  }

  @Delete("comments/:commentId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a comment (Author or Admin)" })
  @ApiResponse({ status: 204, description: "Comment deleted successfully" })
  async deleteComment(
    @Param("workspaceId") workspaceId: string,
    @Param("commentId") commentId: string,
    @CurrentUser("id") userId: string,
    @CurrentWorkspace("role") role: string
  ): Promise<void> {
    return this.commentsService.deleteComment(
      workspaceId,
      commentId,
      userId,
      role
    );
  }
}
