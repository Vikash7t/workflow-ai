import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateChannelMappingDto,
  ChannelMappingDto,
  Platform,
  Priority,
} from "@workflow-ai/contracts";

@Injectable()
export class ChannelRoutingService {
  constructor(private readonly prisma: PrismaService) {}

  private mapChannel(c: any): ChannelMappingDto {
    return {
      id: c.id,
      workspaceId: c.workspaceId,
      projectId: c.projectId,
      platform: c.platform as Platform,
      channelId: c.channelId,
      channelName: c.channelName,
      defaultStatusId: c.defaultStatusId,
      defaultPriority: c.defaultPriority as Priority,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      project: c.project
        ? {
            id: c.project.id,
            name: c.project.name,
            key: c.project.key,
          }
        : undefined,
    };
  }

  async getWorkspaceChannelMappings(workspaceId: string): Promise<ChannelMappingDto[]> {
    const mappings = await this.prisma.channelMapping.findMany({
      where: { workspaceId },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return mappings.map((m) => this.mapChannel(m));
  }

  async createChannelMapping(
    workspaceId: string,
    dto: CreateChannelMappingDto
  ): Promise<ChannelMappingDto> {
    // 1. Verify project exists in workspace (IDOR Guard)
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException("Project not found in this workspace");
    }

    // 2. Validate status belongs to workspace if specified
    if (dto.defaultStatusId) {
      const status = await this.prisma.workflowStatus.findUnique({
        where: { id: dto.defaultStatusId },
      });
      if (!status || status.workspaceId !== workspaceId) {
        throw new BadRequestException("Workflow status not found in this workspace");
      }
    }

    // 3. Upsert on unique composite [platform, channelId]
    const mapping = await this.prisma.channelMapping.upsert({
      where: {
        platform_channelId: {
          platform: dto.platform,
          channelId: dto.channelId,
        },
      },
      create: {
        workspaceId,
        projectId: dto.projectId,
        platform: dto.platform,
        channelId: dto.channelId,
        channelName: dto.channelName || null,
        defaultStatusId: dto.defaultStatusId || null,
        defaultPriority: dto.defaultPriority || "P2",
      },
      update: {
        workspaceId,
        projectId: dto.projectId,
        channelName: dto.channelName || null,
        defaultStatusId: dto.defaultStatusId || null,
        defaultPriority: dto.defaultPriority || "P2",
        updatedAt: new Date(),
      },
      include: {
        project: {
          select: { id: true, name: true, key: true },
        },
      },
    });

    return this.mapChannel(mapping);
  }

  async deleteChannelMapping(
    workspaceId: string,
    mappingId: string
  ): Promise<{ success: boolean }> {
    const existing = await this.prisma.channelMapping.findUnique({
      where: { id: mappingId },
    });

    if (!existing || existing.workspaceId !== workspaceId) {
      throw new NotFoundException("Channel mapping not found in this workspace");
    }

    await this.prisma.channelMapping.delete({
      where: { id: mappingId },
    });

    return { success: true };
  }

  async findMapping(platform: Platform, channelId: string) {
    return this.prisma.channelMapping.findUnique({
      where: {
        platform_channelId: {
          platform,
          channelId,
        },
      },
      include: {
        project: true,
        workspace: true,
      },
    });
  }
}
