import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { RequestWorkspaceContext } from "../decorators/current-workspace.decorator";
import { Role } from "@workflow-ai/contracts";

@Injectable()
export class WorkspaceAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.id) {
      throw new ForbiddenException("Authenticated user context is missing");
    }

    const workspaceId =
      request.params?.workspaceId ||
      request.headers?.["x-workspace-id"] ||
      request.query?.workspaceId;

    if (!workspaceId || typeof workspaceId !== "string") {
      throw new BadRequestException("Workspace identifier required for tenant-scoped operations");
    }

    // 1. Direct workspace membership lookup
    const wsMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: user.id,
        },
      },
      include: {
        workspace: {
          select: {
            id: true,
            organizationId: true,
          },
        },
      },
    });

    if (wsMember) {
      const workspaceContext: RequestWorkspaceContext = {
        workspaceId: wsMember.workspaceId,
        role: wsMember.role as Role,
        organizationId: wsMember.workspace.organizationId,
      };
      request.workspaceMember = workspaceContext;
      return true;
    }

    // 2. Organization Owner/Admin inheritance fallback
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, organizationId: true },
    });

    if (!workspace) {
      throw new ForbiddenException("Workspace not found or access denied");
    }

    const orgMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: workspace.organizationId,
          userId: user.id,
        },
      },
    });

    if (orgMember && (orgMember.role === "OWNER" || orgMember.role === "ADMIN")) {
      const workspaceContext: RequestWorkspaceContext = {
        workspaceId: workspace.id,
        role: orgMember.role as Role,
        organizationId: workspace.organizationId,
      };
      request.workspaceMember = workspaceContext;
      return true;
    }

    throw new ForbiddenException("You do not have access to this workspace");
  }
}
