import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateIssueDto,
  UpdateIssueDto,
  IssueFilterDto,
  IssueDto,
  PaginatedResult,
  IssueType,
  Priority,
  WorkflowCategory,
} from "@workflow-ai/contracts";

@Injectable()
export class IssuesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapIssue(issue: any): IssueDto {
    return {
      id: issue.id,
      projectId: issue.projectId,
      workspaceId: issue.workspaceId,
      issueNumber: issue.issueNumber,
      key: issue.key,
      type: issue.type as IssueType,
      title: issue.title,
      description: issue.description,
      priority: issue.priority as Priority,
      statusId: issue.statusId,
      parentId: issue.parentId,
      assigneeId: issue.assigneeId,
      reporterId: issue.reporterId,
      estimate: issue.estimate,
      dueDate: issue.dueDate ? issue.dueDate.toISOString() : null,
      createdAt: issue.createdAt.toISOString(),
      updatedAt: issue.updatedAt.toISOString(),
      status: issue.status
        ? {
            id: issue.status.id,
            workspaceId: issue.status.workspaceId,
            name: issue.status.name,
            category: issue.status.category as WorkflowCategory,
            color: issue.status.color,
            position: issue.status.position,
            isDefault: issue.status.isDefault,
            createdAt: issue.status.createdAt.toISOString(),
            updatedAt: issue.status.updatedAt.toISOString(),
          }
        : undefined,
      assignee: issue.assignee
        ? {
            id: issue.assignee.id,
            name: issue.assignee.name,
            email: issue.assignee.email,
            image: issue.assignee.image,
          }
        : null,
      reporter: issue.reporter
        ? {
            id: issue.reporter.id,
            name: issue.reporter.name,
            email: issue.reporter.email,
            image: issue.reporter.image,
          }
        : undefined,
      subtaskCount: issue._count?.subtasks ?? 0,
    };
  }

  async create(workspaceId: string, reporterId: string, dto: CreateIssueDto): Promise<IssueDto> {
    // 1. Verify project exists in workspace
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException("Project not found in this workspace");
    }

    // 2. Verify status exists in workspace
    const status = await this.prisma.workflowStatus.findUnique({
      where: { id: dto.statusId },
    });

    if (!status || status.workspaceId !== workspaceId) {
      throw new NotFoundException("Workflow status not found in this workspace");
    }

    // 3. Hierarchy checks
    if (dto.type === "SUBTASK") {
      if (!dto.parentId) {
        throw new BadRequestException("Subtasks must specify a valid parentId");
      }

      const parent = await this.prisma.issue.findUnique({
        where: { id: dto.parentId },
      });

      if (!parent || parent.workspaceId !== workspaceId || parent.projectId !== dto.projectId) {
        throw new BadRequestException("Parent issue not found in the same project");
      }

      if (parent.type === "SUBTASK") {
        throw new BadRequestException("Subtasks cannot be nested inside other subtasks (max depth 2)");
      }

      if (parent.type === "EPIC") {
        throw new BadRequestException("Subtasks cannot be directly attached to Epics");
      }
    } else if (dto.type === "EPIC" && dto.parentId) {
      throw new BadRequestException("Epics cannot have a parent issue");
    }

    // 4. Verify assignee is a workspace member (if specified)
    if (dto.assigneeId) {
      const isMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: dto.assigneeId,
          },
        },
      });

      if (!isMember) {
        throw new BadRequestException("Assignee must be an active member of this workspace");
      }
    }

    // 5. Atomic concurrency-safe sequence generation inside transaction
    const createdIssue = await this.prisma.$transaction(async (tx) => {
      const updatedProj = await tx.project.update({
        where: { id: dto.projectId },
        data: { issueCounter: { increment: 1 } },
        select: { issueCounter: true, key: true },
      });

      const issueNumber = updatedProj.issueCounter;
      const key = `${updatedProj.key}-${issueNumber}`;

      const issue = await tx.issue.create({
        data: {
          projectId: dto.projectId,
          workspaceId,
          issueNumber,
          key,
          type: dto.type,
          title: dto.title.trim(),
          description: dto.description?.trim(),
          priority: dto.priority,
          statusId: dto.statusId,
          parentId: dto.parentId,
          assigneeId: dto.assigneeId,
          reporterId,
          estimate: dto.estimate,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        },
        include: {
          status: true,
          assignee: true,
          reporter: true,
          _count: { select: { subtasks: true } },
        },
      });

      await tx.activityLog.create({
        data: {
          issueId: issue.id,
          userId: reporterId,
          action: "CREATED",
          metadata: { key, title: issue.title },
        },
      });

      return issue;
    });

    return this.mapIssue(createdIssue);
  }

  async list(workspaceId: string, filter: IssueFilterDto): Promise<PaginatedResult<IssueDto>> {
    const where: any = { workspaceId };

    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.statusId) where.statusId = filter.statusId;
    if (filter.type) where.type = filter.type;
    if (filter.priority) where.priority = filter.priority;
    if (filter.assigneeId) where.assigneeId = filter.assigneeId;
    if (filter.reporterId) where.reporterId = filter.reporterId;
    if (filter.parentId) where.parentId = filter.parentId;

    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: "insensitive" } },
        { description: { contains: filter.search, mode: "insensitive" } },
        { key: { contains: filter.search.toUpperCase(), mode: "insensitive" } },
      ];
    }

    const page = filter.page || 1;
    const pageSize = filter.pageSize || 50;
    const skip = (page - 1) * pageSize;

    const [total, issues] = await Promise.all([
      this.prisma.issue.count({ where }),
      this.prisma.issue.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ priority: "asc" }, { createdAt: "desc" }],
        include: {
          status: true,
          assignee: true,
          reporter: true,
          _count: { select: { subtasks: true } },
        },
      }),
    ]);

    return {
      data: issues.map((i) => this.mapIssue(i)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getById(workspaceId: string, issueId: string): Promise<IssueDto> {
    const issue = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        status: true,
        assignee: true,
        reporter: true,
        _count: { select: { subtasks: true } },
      },
    });

    if (!issue || issue.workspaceId !== workspaceId) {
      throw new NotFoundException("Issue not found in this workspace");
    }

    return this.mapIssue(issue);
  }

  async update(
    workspaceId: string,
    issueId: string,
    userId: string,
    dto: UpdateIssueDto
  ): Promise<IssueDto> {
    const existing = await this.prisma.issue.findUnique({
      where: { id: issueId },
      include: { _count: { select: { subtasks: true } } },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      throw new NotFoundException("Issue not found in this workspace");
    }

    // Hierarchy cycle and invalid type validations
    if (dto.parentId !== undefined) {
      if (dto.parentId === issueId) {
        throw new BadRequestException("An issue cannot be its own parent");
      }

      if (dto.parentId) {
        const parent = await this.prisma.issue.findUnique({
          where: { id: dto.parentId },
        });

        if (!parent || parent.workspaceId !== workspaceId || parent.projectId !== existing.projectId) {
          throw new BadRequestException("Parent issue must belong to the same project");
        }

        if (parent.type === "SUBTASK") {
          throw new BadRequestException("Subtasks cannot be nested (max depth 2)");
        }
      }
    }

    if (dto.type === "SUBTASK" && existing._count.subtasks > 0) {
      throw new BadRequestException("Cannot convert an issue with existing subtasks into a subtask");
    }

    // Validate new status
    if (dto.statusId) {
      const status = await this.prisma.workflowStatus.findUnique({
        where: { id: dto.statusId },
      });
      if (!status || status.workspaceId !== workspaceId) {
        throw new BadRequestException("Workflow status not found in this workspace");
      }
    }

    // Validate new assignee
    if (dto.assigneeId) {
      const isMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: dto.assigneeId,
          },
        },
      });

      if (!isMember) {
        throw new BadRequestException("Assignee must be an active member of this workspace");
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.issue.update({
        where: { id: issueId },
        data: {
          ...(dto.title ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
          ...(dto.type ? { type: dto.type } : {}),
          ...(dto.priority ? { priority: dto.priority } : {}),
          ...(dto.statusId ? { statusId: dto.statusId } : {}),
          ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
          ...(dto.assigneeId !== undefined ? { assigneeId: dto.assigneeId } : {}),
          ...(dto.estimate !== undefined ? { estimate: dto.estimate } : {}),
          ...(dto.dueDate !== undefined ? { dueDate: dto.dueDate ? new Date(dto.dueDate) : null } : {}),
        },
        include: {
          status: true,
          assignee: true,
          reporter: true,
          _count: { select: { subtasks: true } },
        },
      });

      // Activity logs
      if (dto.statusId && dto.statusId !== existing.statusId) {
        await tx.activityLog.create({
          data: {
            issueId,
            userId,
            action: "STATUS_CHANGED",
            metadata: { fromStatusId: existing.statusId, toStatusId: dto.statusId },
          },
        });
      }

      if (dto.assigneeId !== undefined && dto.assigneeId !== existing.assigneeId) {
        await tx.activityLog.create({
          data: {
            issueId,
            userId,
            action: "ASSIGNED",
            metadata: { fromAssigneeId: existing.assigneeId, toAssigneeId: dto.assigneeId },
          },
        });
      }

      return result;
    });

    return this.mapIssue(updated);
  }

  async delete(workspaceId: string, issueId: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      throw new NotFoundException("Issue not found in this workspace");
    }

    await this.prisma.issue.delete({
      where: { id: issueId },
    });

    return { success: true };
  }

  async bulkUpdateStatus(
    workspaceId: string,
    issueIds: string[],
    statusId: string,
    userId: string
  ): Promise<{ updatedCount: number }> {
    const status = await this.prisma.workflowStatus.findUnique({
      where: { id: statusId },
    });

    if (!status || status.workspaceId !== workspaceId) {
      throw new NotFoundException("Workflow status not found in this workspace");
    }

    const { count } = await this.prisma.issue.updateMany({
      where: {
        id: { in: issueIds },
        workspaceId,
      },
      data: { statusId },
    });

    return { updatedCount: count };
  }

  async bulkUpdateAssignee(
    workspaceId: string,
    issueIds: string[],
    assigneeId: string | null,
    userId: string
  ): Promise<{ updatedCount: number }> {
    if (assigneeId) {
      const isMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: assigneeId,
          },
        },
      });

      if (!isMember) {
        throw new BadRequestException("Assignee must be an active member of this workspace");
      }
    }

    const { count } = await this.prisma.issue.updateMany({
      where: {
        id: { in: issueIds },
        workspaceId,
      },
      data: { assigneeId },
    });

    return { updatedCount: count };
  }

  async bulkDelete(
    workspaceId: string,
    issueIds: string[]
  ): Promise<{ deletedCount: number }> {
    const { count } = await this.prisma.issue.deleteMany({
      where: {
        id: { in: issueIds },
        workspaceId,
      },
    });

    return { deletedCount: count };
  }
}
