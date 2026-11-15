import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ActivityAction } from "@workflow-ai/contracts";
import { Prisma } from "@prisma/client";

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async logActivity(
    issueId: string,
    action: ActivityAction,
    userId?: string | null,
    metadata?: Record<string, any>,
    tx?: Prisma.TransactionClient
  ) {
    const client = tx || this.prisma;
    return client.activityLog.create({
      data: {
        issueId,
        userId: userId || undefined,
        action,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  }

  async getIssueActivities(workspaceId: string, issueId: string) {
    const issue = await this.prisma.issue.findFirst({
      where: { id: issueId, workspaceId },
      select: { id: true },
    });

    if (!issue) {
      throw new NotFoundException("Issue not found in this workspace");
    }

    const activities = await this.prisma.activityLog.findMany({
      where: { issueId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // Populate user metadata if userId exists
    const userIds = activities
      .map((a) => a.userId)
      .filter((id): id is string => Boolean(id));

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, image: true },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));

    return activities.map((a) => ({
      id: a.id,
      issueId: a.issueId,
      userId: a.userId,
      action: a.action,
      metadata: a.metadata,
      createdAt: a.createdAt.toISOString(),
      user: a.userId ? userMap.get(a.userId) || null : null,
    }));
  }
}
