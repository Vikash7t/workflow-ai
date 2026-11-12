import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import * as crypto from "crypto";
import {
  InviteMemberDto,
  WorkspaceInvitationDto,
  WorkspaceMemberDto,
  Role,
} from "@workflow-ai/contracts";

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  async listWorkspaceMembers(workspaceId: string): Promise<WorkspaceMemberDto[]> {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return members.map((m) => ({
      id: m.id,
      workspaceId: m.workspaceId,
      userId: m.userId,
      role: m.role as Role,
      createdAt: m.createdAt.toISOString(),
      user: {
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
      },
    }));
  }

  async inviteMember(
    workspaceId: string,
    inviterId: string,
    dto: InviteMemberDto
  ): Promise<WorkspaceInvitationDto> {
    const email = dto.email.toLowerCase().trim();

    // 1. Check if user with this email is already a member
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      const alreadyMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId,
            userId: existingUser.id,
          },
        },
      });

      if (alreadyMember) {
        throw new ConflictException("User is already an active member of this workspace");
      }
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiration

    const invitation = await this.prisma.workspaceInvitation.upsert({
      where: {
        workspaceId_email: {
          workspaceId,
          email,
        },
      },
      create: {
        workspaceId,
        email,
        role: dto.role,
        token,
        expiresAt,
        inviterId,
      },
      update: {
        role: dto.role,
        token,
        expiresAt,
        inviterId,
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      id: invitation.id,
      workspaceId: invitation.workspaceId,
      email: invitation.email,
      role: invitation.role as Role,
      token: invitation.token,
      expiresAt: invitation.expiresAt.toISOString(),
      createdAt: invitation.createdAt.toISOString(),
      inviter: {
        name: invitation.inviter.name,
        email: invitation.inviter.email,
      },
    };
  }

  async listPendingInvitations(workspaceId: string): Promise<WorkspaceInvitationDto[]> {
    const invitations = await this.prisma.workspaceInvitation.findMany({
      where: {
        workspaceId,
        expiresAt: { gt: new Date() },
      },
      include: {
        inviter: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return invitations.map((inv) => ({
      id: inv.id,
      workspaceId: inv.workspaceId,
      email: inv.email,
      role: inv.role as Role,
      token: inv.token,
      expiresAt: inv.expiresAt.toISOString(),
      createdAt: inv.createdAt.toISOString(),
      inviter: {
        name: inv.inviter.name,
        email: inv.inviter.email,
      },
    }));
  }

  async revokeInvitation(workspaceId: string, invitationId: string): Promise<{ success: boolean }> {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.workspaceId !== workspaceId) {
      throw new NotFoundException("Invitation not found");
    }

    await this.prisma.workspaceInvitation.delete({
      where: { id: invitationId },
    });

    return { success: true };
  }

  async acceptInvitation(userId: string, token: string): Promise<{ workspaceId: string }> {
    const invitation = await this.prisma.workspaceInvitation.findUnique({
      where: { token },
      include: { workspace: true },
    });

    if (!invitation) {
      throw new NotFoundException("Invalid or non-existent invitation token");
    }

    if (new Date() > invitation.expiresAt) {
      await this.prisma.workspaceInvitation.delete({ where: { id: invitation.id } });
      throw new BadRequestException("Invitation token has expired");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.workspaceMember.upsert({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId,
          },
        },
        create: {
          workspaceId: invitation.workspaceId,
          userId,
          role: invitation.role,
        },
        update: {
          role: invitation.role,
        },
      });

      await tx.workspaceInvitation.delete({
        where: { id: invitation.id },
      });
    });

    return { workspaceId: invitation.workspaceId };
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    newRole: Role,
    requesterId: string
  ): Promise<WorkspaceMemberDto> {
    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
      include: { user: true },
    });

    if (!targetMember || targetMember.workspaceId !== workspaceId) {
      throw new NotFoundException("Workspace member not found");
    }

    // Safety check: Prevent demoting the last ADMIN in the workspace
    if (targetMember.role === "ADMIN" && newRole !== "ADMIN") {
      const adminCount = await this.prisma.workspaceMember.count({
        where: { workspaceId, role: "ADMIN" },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException("Cannot demote the last remaining Admin in the workspace");
      }
    }

    const updated = await this.prisma.workspaceMember.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      userId: updated.userId,
      role: updated.role as Role,
      createdAt: updated.createdAt.toISOString(),
      user: {
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        image: updated.user.image,
      },
    };
  }

  async removeMember(
    workspaceId: string,
    memberId: string,
    requesterId: string
  ): Promise<{ success: boolean }> {
    const targetMember = await this.prisma.workspaceMember.findUnique({
      where: { id: memberId },
    });

    if (!targetMember || targetMember.workspaceId !== workspaceId) {
      throw new NotFoundException("Workspace member not found");
    }

    if (targetMember.role === "ADMIN") {
      const adminCount = await this.prisma.workspaceMember.count({
        where: { workspaceId, role: "ADMIN" },
      });

      if (adminCount <= 1) {
        throw new ForbiddenException("Cannot remove the last remaining Admin from the workspace");
      }
    }

    await this.prisma.workspaceMember.delete({
      where: { id: memberId },
    });

    return { success: true };
  }
}
