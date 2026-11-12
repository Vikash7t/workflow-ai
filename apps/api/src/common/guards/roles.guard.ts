import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";
import { Role } from "@workflow-ai/contracts";

const ROLE_RANK: Record<Role, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const workspaceMember = request.workspaceMember;

    if (!workspaceMember || !workspaceMember.role) {
      throw new ForbiddenException("Tenant membership role required for this action");
    }

    const userRole = workspaceMember.role as Role;
    const userRank = ROLE_RANK[userRole] ?? 0;

    // Check if user's role rank matches or exceeds any of the required roles
    const hasPermission = requiredRoles.some((requiredRole) => {
      const requiredRank = ROLE_RANK[requiredRole] ?? 0;
      return userRank >= requiredRank;
    });

    if (!hasPermission) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredRoles.join(" or ")}, Current: ${userRole}`
      );
    }

    return true;
  }
}
