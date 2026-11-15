import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ActivitiesService } from "../activities/activities.service";
import { CreateDependencyDto, DependencyType } from "@workflow-ai/contracts";

const MAX_CYCLE_DEPTH = 50;

@Injectable()
export class DependenciesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService
  ) {}

  async addDependency(
    workspaceId: string,
    issueId: string,
    currentUserId: string,
    data: CreateDependencyDto
  ) {
    const { targetIssueId, type = "BLOCKS" } = data;

    if (issueId === targetIssueId) {
      throw new BadRequestException("An issue cannot depend on itself");
    }

    // Dual-issue tenant check: BOTH issues must belong to this workspace
    const [sourceIssue, targetIssue] = await Promise.all([
      this.prisma.issue.findFirst({
        where: { id: issueId, workspaceId },
        select: { id: true, key: true, title: true },
      }),
      this.prisma.issue.findFirst({
        where: { id: targetIssueId, workspaceId },
        select: { id: true, key: true, title: true },
      }),
    ]);

    if (!sourceIssue || !targetIssue) {
      throw new NotFoundException("One or both issues not found in this workspace");
    }

    // In our convention: issueId is blocked by targetIssueId (target blocks source)
    // or if type is BLOCKS: targetIssue is blocker, sourceIssue is blocked
    const blockerId = targetIssueId;
    const blockedId = issueId;

    // Check if dependency already exists
    const existing = await this.prisma.issueDependency.findUnique({
      where: {
        blockerIssueId_blockedIssueId: {
          blockerIssueId: blockerId,
          blockedIssueId: blockedId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException("This dependency relationship already exists");
    }

    // Transactional Insertion with Post-Insert DFS Cycle Detection
    return this.prisma.$transaction(async (tx) => {
      const created = await tx.issueDependency.create({
        data: {
          blockerIssueId: blockerId,
          blockedIssueId: blockedId,
          type,
        },
        include: {
          blocker: {
            select: {
              id: true,
              key: true,
              title: true,
              statusId: true,
              status: { select: { name: true, category: true } },
            },
          },
          blocked: {
            select: {
              id: true,
              key: true,
              title: true,
              statusId: true,
              status: { select: { name: true, category: true } },
            },
          },
        },
      });

      // If type is BLOCKS, run cycle detection
      if (type === "BLOCKS") {
        const hasCycle = await this.detectCycle(tx, blockedId, blockerId);
        if (hasCycle) {
          throw new BadRequestException(
            `Circular dependency detected: Issue "${sourceIssue.key}" already transitively blocks Issue "${targetIssue.key}"`
          );
        }
      }

      // Record activity
      await this.activitiesService.logActivity(
        blockedId,
        "DEPENDENCY_ADDED",
        currentUserId,
        {
          blockerKey: targetIssue.key,
          type,
        },
        tx
      );

      return {
        id: created.id,
        blockerIssueId: created.blockerIssueId,
        blockedIssueId: created.blockedIssueId,
        type: created.type as DependencyType,
        createdAt: created.createdAt.toISOString(),
        blocker: {
          id: created.blocker.id,
          key: created.blocker.key,
          title: created.blocker.title,
          statusId: created.blocker.statusId,
          statusName: created.blocker.status.name,
          category: created.blocker.status.category,
        },
        blocked: {
          id: created.blocked.id,
          key: created.blocked.key,
          title: created.blocked.title,
          statusId: created.blocked.statusId,
          statusName: created.blocked.status.name,
          category: created.blocked.status.category,
        },
      };
    });
  }

  /**
   * DFS Cycle Detection: Checks if `fromIssueId` can reach `targetBlockerId`
   * via existing BLOCKS relationships.
   */
  private async detectCycle(
    tx: any,
    fromIssueId: string,
    targetBlockerId: string
  ): Promise<boolean> {
    const visited = new Set<string>();

    const dfs = async (currentId: string, depth: number): Promise<boolean> => {
      if (depth > MAX_CYCLE_DEPTH) return false;
      if (currentId === targetBlockerId) return true;
      if (visited.has(currentId)) return false;

      visited.add(currentId);

      // Find all issues where currentId is the blocker (currentId -> blocked)
      const outgoing = await tx.issueDependency.findMany({
        where: { blockerIssueId: currentId, type: "BLOCKS" },
        select: { blockedIssueId: true },
      });

      for (const edge of outgoing) {
        if (await dfs(edge.blockedIssueId, depth + 1)) {
          return true;
        }
      }

      return false;
    };

    return dfs(fromIssueId, 0);
  }

  async listDependencies(workspaceId: string, issueId: string) {
    const issue = await this.prisma.issue.findFirst({
      where: { id: issueId, workspaceId },
      select: { id: true },
    });

    if (!issue) {
      throw new NotFoundException("Issue not found in this workspace");
    }

    const [blockedBy, blocking] = await Promise.all([
      // Issues blocking this issue
      this.prisma.issueDependency.findMany({
        where: { blockedIssueId: issueId },
        include: {
          blocker: {
            select: {
              id: true,
              key: true,
              title: true,
              statusId: true,
              status: { select: { name: true, category: true } },
            },
          },
        },
      }),
      // Issues blocked by this issue
      this.prisma.issueDependency.findMany({
        where: { blockerIssueId: issueId },
        include: {
          blocked: {
            select: {
              id: true,
              key: true,
              title: true,
              statusId: true,
              status: { select: { name: true, category: true } },
            },
          },
        },
      }),
    ]);

    return {
      blockedBy: blockedBy.map((d) => ({
        id: d.id,
        blockerIssueId: d.blockerIssueId,
        blockedIssueId: d.blockedIssueId,
        type: d.type as DependencyType,
        createdAt: d.createdAt.toISOString(),
        issue: {
          id: d.blocker.id,
          key: d.blocker.key,
          title: d.blocker.title,
          statusId: d.blocker.statusId,
          statusName: d.blocker.status.name,
          category: d.blocker.status.category,
        },
      })),
      blocking: blocking.map((d) => ({
        id: d.id,
        blockerIssueId: d.blockerIssueId,
        blockedIssueId: d.blockedIssueId,
        type: d.type as DependencyType,
        createdAt: d.createdAt.toISOString(),
        issue: {
          id: d.blocked.id,
          key: d.blocked.key,
          title: d.blocked.title,
          statusId: d.blocked.statusId,
          statusName: d.blocked.status.name,
          category: d.blocked.status.category,
        },
      })),
    };
  }

  async removeDependency(
    workspaceId: string,
    dependencyId: string,
    currentUserId: string
  ) {
    const dependency = await this.prisma.issueDependency.findUnique({
      where: { id: dependencyId },
      include: {
        blocked: { select: { id: true, workspaceId: true, key: true } },
        blocker: { select: { id: true, workspaceId: true, key: true } },
      },
    });

    if (
      !dependency ||
      dependency.blocked.workspaceId !== workspaceId ||
      dependency.blocker.workspaceId !== workspaceId
    ) {
      throw new NotFoundException("Dependency not found in this workspace");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.issueDependency.delete({
        where: { id: dependencyId },
      });

      await this.activitiesService.logActivity(
        dependency.blockedIssueId,
        "DEPENDENCY_REMOVED",
        currentUserId,
        {
          blockerKey: dependency.blocker.key,
          type: dependency.type,
        },
        tx
      );
    });
  }
}
