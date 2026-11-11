# ADR-0002: Multi-Tenant Isolation and RBAC Authorization Model

## Status
Approved (Phase 0)

## Context
A project management system stores sensitive company roadmaps, technical plans, and intellectual property. The system supports multiple organizations, and each organization can have multiple workspaces. We must define:
1. Whether Organization membership automatically grants access to all workspaces.
2. How tenant boundaries are validated on every request.
3. How to prevent Broken Object-Level Authorization (BOLA/IDOR).

## Decision
1. **Two-Tier Tenancy:**
   - **Organization:** Billing and legal boundary.
   - **Workspace:** Operational boundary. Projects and issues belong directly to a Workspace.
2. **Explicit Workspace Membership:**
   - Organization `Owner` and `Admin` roles can view and manage all workspaces within their organization.
   - Regular `Member` roles **only have access to workspaces where an explicit `WorkspaceMember` record exists**. Being an organization member does not leak private workspaces.
3. **Guard Enforcement (`WorkspaceAccessGuard`):**
   - Every workspace endpoint (`/workspaces/:workspaceId/*`) executes a guard that inspects `req.user.id` against `WorkspaceMember`.
   - The user's role (`Owner`, `Admin`, `Member`, `Viewer`) is attached to `req.workspaceMember`.
4. **Scoped Database Access:**
   - Every Prisma query for projects, issues, comments, and statuses must include `where: { workspaceId: req.workspaceMember.workspaceId }`.
   - Never rely on client-supplied tenant identifiers without backend membership verification.

## Consequences
- **Positive:** Mathematically prevents cross-tenant data leakage. Secure by default.
- **Negative:** Requires an extra membership lookup query per request, which will be mitigated via index caching on the active session.
