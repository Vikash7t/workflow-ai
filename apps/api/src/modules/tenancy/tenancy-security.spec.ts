import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Reflector } from "@nestjs/core";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Role } from "@workflow-ai/contracts";

function createMockContext(role?: Role): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        workspaceMember: role ? { role, workspaceId: "ws-123" } : undefined,
      }),
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe("Security Audit: RBAC & Tenant Authorization (OWASP Top 10)", () => {
  const reflector = new Reflector();
  const rolesGuard = new RolesGuard(reflector);

  it("permits OWNER and ADMIN when route requires ADMIN role", () => {
    reflector.getAllAndOverride = () => ["ADMIN"];

    const adminCtx = createMockContext("ADMIN");
    assert.equal(rolesGuard.canActivate(adminCtx), true);

    const ownerCtx = createMockContext("OWNER");
    assert.equal(rolesGuard.canActivate(ownerCtx), true);
  });

  it("denies access to MEMBER and VIEWER when route requires ADMIN role", () => {
    reflector.getAllAndOverride = () => ["ADMIN"];

    const memberCtx = createMockContext("MEMBER");
    assert.throws(
      () => rolesGuard.canActivate(memberCtx),
      (err: any) => err instanceof ForbiddenException && err.message.includes("Insufficient permissions")
    );

    const viewerCtx = createMockContext("VIEWER");
    assert.throws(
      () => rolesGuard.canActivate(viewerCtx),
      (err: any) => err instanceof ForbiddenException && err.message.includes("Insufficient permissions")
    );
  });

  it("denies access when no tenant membership context is present (BOLA/IDOR protection)", () => {
    reflector.getAllAndOverride = () => ["MEMBER"];
    const emptyCtx = createMockContext(undefined);

    assert.throws(
      () => rolesGuard.canActivate(emptyCtx),
      (err: any) => err instanceof ForbiddenException && err.message.includes("Tenant membership role required")
    );
  });

  it("permits all roles when route has no @Roles restriction", () => {
    reflector.getAllAndOverride = () => undefined;

    const viewerCtx = createMockContext("VIEWER");
    assert.equal(rolesGuard.canActivate(viewerCtx), true);
  });
});
