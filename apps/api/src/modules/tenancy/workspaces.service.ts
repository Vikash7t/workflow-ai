import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  WorkspaceDto,
  Role,
} from "@workflow-ai/contracts";

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async create(userId: string, dto: CreateWorkspaceDto): Promise<WorkspaceDto> {
    const orgMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: dto.organizationId,
          userId,
        },
      },
    });

    if (!orgMember || (orgMember.role !== "OWNER" && orgMember.role !== "ADMIN")) {
      throw new ForbiddenException("Only Organization Owners and Admins can create workspaces");
    }

    const baseSlug = dto.slug || this.slugify(dto.name);
    let finalSlug = baseSlug;
    let counter = 1;

    while (await this.prisma.workspace.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const workspace = await this.prisma.$transaction(async (tx) => {
      const createdWs = await tx.workspace.create({
        data: {
          organizationId: dto.organizationId,
          name: dto.name,
          slug: finalSlug,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: createdWs.id,
          userId,
          role: "ADMIN",
        },
      });

      const defaultStatuses = [
        { name: "Backlog", category: "BACKLOG", color: "#9CA3AF", position: 0 },
        { name: "Todo", category: "UNSTARTED", color: "#3B82F6", position: 1, isDefault: true },
        { name: "In Progress", category: "STARTED", color: "#F59E0B", position: 2 },
        { name: "In Review", category: "STARTED", color: "#8B5CF6", position: 3 },
        { name: "Done", category: "COMPLETED", color: "#10B981", position: 4 },
      ];

      for (const s of defaultStatuses) {
        await tx.workflowStatus.create({
          data: {
            workspaceId: createdWs.id,
            name: s.name,
            category: s.category,
            color: s.color,
            position: s.position,
            isDefault: s.isDefault ?? false,
          },
        });
      }

      return createdWs;
    });

    return {
      id: workspace.id,
      organizationId: workspace.organizationId,
      name: workspace.name,
      slug: workspace.slug,
      role: "ADMIN",
      createdAt: workspace.createdAt.toISOString(),
      updatedAt: workspace.updatedAt.toISOString(),
    };
  }

  async listForUser(userId: string): Promise<WorkspaceDto[]> {
    const directMemberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
      orderBy: { createdAt: "asc" },
    });

    const orgMemberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        role: { in: ["OWNER", "ADMIN"] },
      },
      include: {
        organization: {
          include: {
            workspaces: true,
          },
        },
      },
    });

    const workspaceMap = new Map<string, WorkspaceDto>();

    for (const om of orgMemberships) {
      for (const ws of om.organization.workspaces) {
        workspaceMap.set(ws.id, {
          id: ws.id,
          organizationId: ws.organizationId,
          name: ws.name,
          slug: ws.slug,
          role: om.role as Role,
          createdAt: ws.createdAt.toISOString(),
          updatedAt: ws.updatedAt.toISOString(),
        });
      }
    }

    for (const dm of directMemberships) {
      workspaceMap.set(dm.workspaceId, {
        id: dm.workspace.id,
        organizationId: dm.workspace.organizationId,
        name: dm.workspace.name,
        slug: dm.workspace.slug,
        role: dm.role as Role,
        createdAt: dm.workspace.createdAt.toISOString(),
        updatedAt: dm.workspace.updatedAt.toISOString(),
      });
    }

    return Array.from(workspaceMap.values());
  }

  async getById(workspaceId: string, role: Role): Promise<WorkspaceDto> {
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!ws) {
      throw new NotFoundException("Workspace not found");
    }

    return {
      id: ws.id,
      organizationId: ws.organizationId,
      name: ws.name,
      slug: ws.slug,
      role,
      createdAt: ws.createdAt.toISOString(),
      updatedAt: ws.updatedAt.toISOString(),
    };
  }

  async update(workspaceId: string, dto: UpdateWorkspaceDto, role: Role): Promise<WorkspaceDto> {
    const updated = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
      },
    });

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      name: updated.name,
      slug: updated.slug,
      role,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
