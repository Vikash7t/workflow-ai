import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationDto,
  Role,
} from "@workflow-ai/contracts";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  async create(userId: string, dto: CreateOrganizationDto): Promise<OrganizationDto> {
    const baseSlug = dto.slug || this.slugify(dto.name);
    let finalSlug = baseSlug;
    let counter = 1;

    while (await this.prisma.organization.findUnique({ where: { slug: finalSlug } })) {
      finalSlug = `${baseSlug}-${counter++}`;
    }

    const org = await this.prisma.$transaction(async (tx) => {
      const createdOrg = await tx.organization.create({
        data: {
          name: dto.name,
          slug: finalSlug,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: createdOrg.id,
          userId,
          role: "OWNER",
        },
      });

      return createdOrg;
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      role: "OWNER",
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    };
  }

  async listForUser(userId: string): Promise<OrganizationDto[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: {
        organization: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      slug: m.organization.slug,
      role: m.role as Role,
      createdAt: m.organization.createdAt.toISOString(),
      updatedAt: m.organization.updatedAt.toISOString(),
    }));
  }

  async getById(userId: string, organizationId: string): Promise<OrganizationDto> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
      include: {
        organization: true,
      },
    });

    if (!membership) {
      throw new NotFoundException("Organization not found or access denied");
    }

    return {
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug,
      role: membership.role as Role,
      createdAt: membership.organization.createdAt.toISOString(),
      updatedAt: membership.organization.updatedAt.toISOString(),
    };
  }

  async update(
    userId: string,
    organizationId: string,
    dto: UpdateOrganizationDto
  ): Promise<OrganizationDto> {
    const membership = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!membership || (membership.role !== "OWNER" && membership.role !== "ADMIN")) {
      throw new ForbiddenException("Only Organization Owners or Admins can update settings");
    }

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.name ? { name: dto.name } : {}),
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      role: membership.role as Role,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
