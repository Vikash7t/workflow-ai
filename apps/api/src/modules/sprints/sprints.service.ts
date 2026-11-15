import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ActivitiesService } from "../activities/activities.service";
import {
  CreateSprintDto,
  UpdateSprintDto,
  CompleteSprintDto,
  SprintStatus,
} from "@workflow-ai/contracts";

@Injectable()
export class SprintsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activitiesService: ActivitiesService
  ) {}

  async createSprint(workspaceId: string, data: CreateSprintDto) {
    const project = await this.prisma.project.findFirst({
      where: { id: data.projectId, workspaceId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException("Project not found in this workspace");
    }

    const sprint = await this.prisma.sprint.create({
      data: {
        projectId: data.projectId,
        workspaceId,
        name: data.name,
        goal: data.goal || null,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        status: "PLANNED",
      },
    });

    return {
      id: sprint.id,
      projectId: sprint.projectId,
      workspaceId: sprint.workspaceId,
      name: sprint.name,
      goal: sprint.goal,
      status: sprint.status as SprintStatus,
      startDate: sprint.startDate?.toISOString() || null,
      endDate: sprint.endDate?.toISOString() || null,
      createdAt: sprint.createdAt.toISOString(),
      updatedAt: sprint.updatedAt.toISOString(),
      issueCount: 0,
      totalPoints: 0,
      completedPoints: 0,
    };
  }

  async listSprints(workspaceId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException("Project not found in this workspace");
    }

    const sprints = await this.prisma.sprint.findMany({
      where: { projectId, workspaceId },
      orderBy: { createdAt: "desc" },
      include: {
        issues: {
          select: {
            id: true,
            estimate: true,
            status: { select: { category: true } },
          },
        },
      },
    });

    return sprints.map((s) => {
      const issueCount = s.issues.length;
      const totalPoints = s.issues.reduce((sum, i) => sum + (i.estimate || 0), 0);
      const completedPoints = s.issues
        .filter((i) => i.status.category === "COMPLETED")
        .reduce((sum, i) => sum + (i.estimate || 0), 0);

      return {
        id: s.id,
        projectId: s.projectId,
        workspaceId: s.workspaceId,
        name: s.name,
        goal: s.goal,
        status: s.status as SprintStatus,
        startDate: s.startDate?.toISOString() || null,
        endDate: s.endDate?.toISOString() || null,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        issueCount,
        totalPoints,
        completedPoints,
      };
    });
  }

  async updateSprint(
    workspaceId: string,
    sprintId: string,
    data: UpdateSprintDto
  ) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, workspaceId },
    });

    if (!sprint) {
      throw new NotFoundException("Sprint not found in this workspace");
    }

    // Invariant check: Single active sprint per project
    if (data.status === "ACTIVE" && sprint.status !== "ACTIVE") {
      const activeSprint = await this.prisma.sprint.findFirst({
        where: {
          projectId: sprint.projectId,
          status: "ACTIVE",
          id: { not: sprintId },
        },
        select: { name: true },
      });

      if (activeSprint) {
        throw new BadRequestException(
          `Sprint "${activeSprint.name}" is already active. Complete it before starting a new sprint.`
        );
      }
    }

    const updated = await this.prisma.sprint.update({
      where: { id: sprintId },
      data: {
        name: data.name,
        goal: data.goal !== undefined ? data.goal : undefined,
        status: data.status,
        startDate: data.startDate !== undefined ? (data.startDate ? new Date(data.startDate) : null) : undefined,
        endDate: data.endDate !== undefined ? (data.endDate ? new Date(data.endDate) : null) : undefined,
      },
      include: {
        issues: {
          select: {
            id: true,
            estimate: true,
            status: { select: { category: true } },
          },
        },
      },
    });

    const issueCount = updated.issues.length;
    const totalPoints = updated.issues.reduce((sum, i) => sum + (i.estimate || 0), 0);
    const completedPoints = updated.issues
      .filter((i) => i.status.category === "COMPLETED")
      .reduce((sum, i) => sum + (i.estimate || 0), 0);

    return {
      id: updated.id,
      projectId: updated.projectId,
      workspaceId: updated.workspaceId,
      name: updated.name,
      goal: updated.goal,
      status: updated.status as SprintStatus,
      startDate: updated.startDate?.toISOString() || null,
      endDate: updated.endDate?.toISOString() || null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
      issueCount,
      totalPoints,
      completedPoints,
    };
  }

  async completeSprint(
    workspaceId: string,
    sprintId: string,
    currentUserId: string,
    data: CompleteSprintDto
  ) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, workspaceId },
      include: {
        issues: {
          select: {
            id: true,
            status: { select: { category: true } },
          },
        },
      },
    });

    if (!sprint) {
      throw new NotFoundException("Sprint not found in this workspace");
    }

    if (sprint.status !== "ACTIVE") {
      throw new BadRequestException("Only active sprints can be completed");
    }

    // Cross-project sprint assignment validation
    if (data.targetSprintId) {
      const target = await this.prisma.sprint.findFirst({
        where: { id: data.targetSprintId, workspaceId },
        select: { id: true, projectId: true, status: true },
      });

      if (!target) {
        throw new NotFoundException("Target rollover sprint not found");
      }
      if (target.projectId !== sprint.projectId) {
        throw new BadRequestException("Target sprint must belong to the same project");
      }
      if (target.status === "COMPLETED") {
        throw new BadRequestException("Cannot rollover issues to an already completed sprint");
      }
    }

    // Atomic rollover transaction
    return this.prisma.$transaction(async (tx) => {
      // 1. Mark sprint as COMPLETED
      const completed = await tx.sprint.update({
        where: { id: sprintId },
        data: { status: "COMPLETED" },
      });

      // 2. Find incomplete issues
      const incompleteIssueIds = sprint.issues
        .filter(
          (i) =>
            i.status.category !== "COMPLETED" && i.status.category !== "CANCELLED"
        )
        .map((i) => i.id);

      // 3. Move incomplete issues to targetSprintId or null (backlog)
      if (incompleteIssueIds.length > 0) {
        await tx.issue.updateMany({
          where: { id: { in: incompleteIssueIds } },
          data: { sprintId: data.targetSprintId || null },
        });

        // 4. Log rollover activity
        for (const issueId of incompleteIssueIds) {
          await this.activitiesService.logActivity(
            issueId,
            "SPRINT_CHANGED",
            currentUserId,
            {
              fromSprint: sprint.name,
              toSprint: data.targetSprintId ? "Next Sprint" : "Backlog",
              reason: "Sprint completed",
            },
            tx
          );
        }
      }

      return {
        id: completed.id,
        name: completed.name,
        status: completed.status as SprintStatus,
        rolledOverCount: incompleteIssueIds.length,
      };
    });
  }

  async deleteSprint(workspaceId: string, sprintId: string) {
    const sprint = await this.prisma.sprint.findFirst({
      where: { id: sprintId, workspaceId },
    });

    if (!sprint) {
      throw new NotFoundException("Sprint not found in this workspace");
    }

    await this.prisma.$transaction(async (tx) => {
      // Unlink issues from sprint
      await tx.issue.updateMany({
        where: { sprintId },
        data: { sprintId: null },
      });

      await tx.sprint.delete({
        where: { id: sprintId },
      });
    });
  }
}
