import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface RequestWorkspaceContext {
  workspaceId: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  organizationId: string;
}

export const CurrentWorkspace = createParamDecorator(
  (data: keyof RequestWorkspaceContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const workspaceMember = request.workspaceMember as RequestWorkspaceContext | undefined;
    return data ? workspaceMember?.[data] : workspaceMember;
  }
);
