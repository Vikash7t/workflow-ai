import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ActivitiesService } from "../activities/activities.service";
import { CreateCommentDto, UpdateCommentDto } from "@workflow-ai/contracts";

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService
  ) {}

  async createComment(
    workspaceId: string,
    issueId: string,
    userId: string,
    data: CreateCommentDto
  ) {
    const issue = await this.prisma.issue.findFirst({
      where: { id: issueId, workspaceId },
      select: { id: true, key: true },
    });

    if (!issue) {
      throw new NotFoundException("Issue not found in this workspace");
    }

    const comment = await this.prisma.comment.create({
      data: {
        issueId,
        userId,
        body: data.body,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    // Record activity log
    await this.activitiesService.logActivity(
      issueId,
      "COMMENTED",
      userId,
      { commentId: comment.id, bodySnippet: data.body.slice(0, 100) }
    );

    return {
      id: comment.id,
      issueId: comment.issueId,
      userId: comment.userId,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      user: comment.user,
    };
  }

  async listComments(workspaceId: string, issueId: string) {
    const issue = await this.prisma.issue.findFirst({
      where: { id: issueId, workspaceId },
      select: { id: true },
    });

    if (!issue) {
      throw new NotFoundException("Issue not found in this workspace");
    }

    const comments = await this.prisma.comment.findMany({
      where: { issueId },
      orderBy: { createdAt: "asc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return comments.map((c) => ({
      id: c.id,
      issueId: c.issueId,
      userId: c.userId,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      user: c.user,
    }));
  }

  async updateComment(
    workspaceId: string,
    commentId: string,
    currentUserId: string,
    currentRole: string,
    data: UpdateCommentDto
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { issue: { select: { workspaceId: true } } },
    });

    if (!comment || comment.issue.workspaceId !== workspaceId) {
      throw new NotFoundException("Comment not found in this workspace");
    }

    const isAuthor = comment.userId === currentUserId;
    const isWorkspaceAdmin = currentRole === "OWNER" || currentRole === "ADMIN";

    if (!isAuthor && !isWorkspaceAdmin) {
      throw new ForbiddenException("You do not have permission to edit this comment");
    }

    const updated = await this.prisma.comment.update({
      where: { id: commentId },
      data: { body: data.body },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return {
      id: updated.id,
      issueId: updated.issueId,
      userId: updated.userId,
      body: updated.body,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      user: updated.user,
    };
  }

  async deleteComment(
    workspaceId: string,
    commentId: string,
    currentUserId: string,
    currentRole: string
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: { issue: { select: { workspaceId: true } } },
    });

    if (!comment || comment.issue.workspaceId !== workspaceId) {
      throw new NotFoundException("Comment not found in this workspace");
    }

    const isAuthor = comment.userId === currentUserId;
    const isWorkspaceAdmin = currentRole === "OWNER" || currentRole === "ADMIN";

    if (!isAuthor && !isWorkspaceAdmin) {
      throw new ForbiddenException("You do not have permission to delete this comment");
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });
  }
}
