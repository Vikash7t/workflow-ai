import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateWorkflowStatusDto,
  UpdateWorkflowStatusDto,
  WorkflowStatusDto,
  WorkflowCategory,
} from "@workflow-ai/contracts";

@Injectable()
export class WorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async listStatuses(workspaceId: string): Promise<WorkflowStatusDto[]> {
    const statuses = await this.prisma.workflowStatus.findMany({
      where: { workspaceId },
      orderBy: { position: "asc" },
    });

    return statuses.map((s) => ({
      id: s.id,
      workspaceId: s.workspaceId,
      name: s.name,
      category: s.category as WorkflowCategory,
      color: s.color,
      position: s.position,
      isDefault: s.isDefault,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));
  }

  async createStatus(workspaceId: string, dto: CreateWorkflowStatusDto): Promise<WorkflowStatusDto> {
    const existing = await this.prisma.workflowStatus.findUnique({
      where: {
        workspaceId_name: {
          workspaceId,
          name: dto.name.trim(),
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Workflow status '${dto.name}' already exists in this workspace`);
    }

    let position = dto.position;
    if (position === undefined) {
      const maxStatus = await this.prisma.workflowStatus.findFirst({
        where: { workspaceId },
        orderBy: { position: "desc" },
        select: { position: true },
      });
      position = (maxStatus?.position ?? -1) + 1;
    }

    const status = await this.prisma.workflowStatus.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        category: dto.category,
        color: dto.color,
        position,
        isDefault: false,
      },
    });

    return {
      id: status.id,
      workspaceId: status.workspaceId,
      name: status.name,
      category: status.category as WorkflowCategory,
      color: status.color,
      position: status.position,
      isDefault: status.isDefault,
      createdAt: status.createdAt.toISOString(),
      updatedAt: status.updatedAt.toISOString(),
    };
  }

  async updateStatus(
    workspaceId: string,
    statusId: string,
    dto: UpdateWorkflowStatusDto
  ): Promise<WorkflowStatusDto> {
    const existing = await this.prisma.workflowStatus.findUnique({
      where: { id: statusId },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      throw new NotFoundException("Workflow status not found");
    }

    const updated = await this.prisma.workflowStatus.update({
      where: { id: statusId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.category ? { category: dto.category } : {}),
        ...(dto.color ? { color: dto.color } : {}),
        ...(dto.position !== undefined ? { position: dto.position } : {}),
        ...(dto.isDefault !== undefined ? { isDefault: dto.isDefault } : {}),
      },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      name: updated.name,
      category: updated.category as WorkflowCategory,
      color: updated.color,
      position: updated.position,
      isDefault: updated.isDefault,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async reorderStatuses(workspaceId: string, statusIds: string[]): Promise<WorkflowStatusDto[]> {
    await this.prisma.$transaction(
      statusIds.map((id, index) =>
        this.prisma.workflowStatus.updateMany({
          where: { id, workspaceId },
          data: { position: index },
        })
      )
    );

    return this.listStatuses(workspaceId);
  }

  async deleteStatus(workspaceId: string, statusId: string): Promise<{ success: boolean }> {
    const existing = await this.prisma.workflowStatus.findUnique({
      where: { id: statusId },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      throw new NotFoundException("Workflow status not found");
    }

    const issueCount = await this.prisma.issue.count({
      where: { statusId },
    });

    if (issueCount > 0) {
      throw new BadRequestException(
        `Cannot delete status '${existing.name}' because it contains ${issueCount} active issue(s). Reassign them first.`
      );
    }

    await this.prisma.workflowStatus.delete({
      where: { id: statusId },
    });

    return { success: true };
  }
}
