import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { CreateProjectDto, UpdateProjectDto, ProjectDto } from "@workflow-ai/contracts";

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateProjectDto): Promise<ProjectDto> {
    const key = dto.key.toUpperCase().trim();

    const existing = await this.prisma.project.findUnique({
      where: {
        workspaceId_key: {
          workspaceId,
          key,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Project with key '${key}' already exists in this workspace`);
    }

    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name.trim(),
        key,
        description: dto.description?.trim(),
        issueCounter: 0,
      },
    });

    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      key: project.key,
      description: project.description,
      issueCounter: project.issueCounter,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async list(workspaceId: string): Promise<ProjectDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
    });

    return projects.map((p) => ({
      id: p.id,
      workspaceId: p.workspaceId,
      name: p.name,
      key: p.key,
      description: p.description,
      issueCounter: p.issueCounter,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async getById(workspaceId: string, projectId: string): Promise<ProjectDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException("Project not found in this workspace");
    }

    return {
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      key: project.key,
      description: project.description,
      issueCounter: project.issueCounter,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  async update(
    workspaceId: string,
    projectId: string,
    dto: UpdateProjectDto
  ): Promise<ProjectDto> {
    await this.getById(workspaceId, projectId);

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description?.trim() } : {}),
      },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      name: updated.name,
      key: updated.key,
      description: updated.description,
      issueCounter: updated.issueCounter,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  async delete(workspaceId: string, projectId: string): Promise<{ success: boolean }> {
    await this.getById(workspaceId, projectId);

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    return { success: true };
  }
}
