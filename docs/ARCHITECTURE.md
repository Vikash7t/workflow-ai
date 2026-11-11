# Workflow AI — Technical Architecture Specification

## 1. Monorepo Structure

We employ an npm/pnpm workspace monorepo layout optimized for type-safety, rapid builds, and distinct runtime boundaries:

```
workflow-ai/
├── apps/
│   ├── web/                     # Next.js 16 Frontend Application (Port 3000)
│   │   ├── src/
│   │   │   ├── app/             # App Router pages and route groups
│   │   │   │   ├── (auth)/      # Login, Register, Invite acceptance
│   │   │   │   ├── (dashboard)/ # Protected workspace routes: projects, boards, settings
│   │   │   │   └── api/         # Proxy/client auth routes
│   │   │   ├── components/      # UI components (shadcn/ui, kanban, table, drawer)
│   │   │   ├── hooks/           # Custom React hooks (TanStack Query mutations/queries)
│   │   │   ├── stores/          # Zustand stores (UI layout, active filters, selection)
│   │   │   └── lib/             # API clients, Better Auth client setup
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                     # NestJS 12 Modular Backend API (Port 4000)
│       ├── src/
│       │   ├── common/          # Guards, Interceptors, Pipes, Filters, Decorators
│       │   ├── config/          # Zod-validated environment configuration
│       │   ├── database/        # PrismaService, transaction runners, migrations
│       │   ├── modules/
│       │   │   ├── auth/        # Better Auth integration, SessionGuard, CurrentUser
│       │   │   ├── tenancy/     # Organizations, Workspaces, Memberships, RBAC
│       │   │   ├── projects/    # Project CRUD, identifier uniqueness
│       │   │   ├── workflows/   # Customizable statuses and transitions
│       │   │   ├── issues/      # Issue lifecycle, hierarchy, numbering, bulk ops
│       │   │   ├── comments/    # Comments, attachments, activity audit log
│       │   │   ├── planning/    # Sprints, milestones, dependencies
│       │   │   ├── ai/          # Vercel AI SDK gateway, task decomposition, copilot
│       │   │   ├── webhooks/    # GitHub/GitLab inbound webhook processing
│       │   │   └── health/      # Liveness, readiness, database probes
│       │   ├── app.module.ts
│       │   └── main.ts
│       ├── prisma/
│       │   ├── schema.prisma    # PostgreSQL Schema
│       │   └── migrations/      # Version-controlled SQL migrations
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   ├── contracts/               # Shared TypeScript types, DTOs, Zod validation schemas
│   │   ├── src/
│   │   │   ├── auth.contract.ts
│   │   │   ├── workspace.contract.ts
│   │   │   ├── issue.contract.ts
│   │   │   ├── ai.contract.ts
│   │   │   └── common.contract.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── config/                  # Shared ESLint, Prettier, and TSConfig presets
├── docs/                        # Architectural documentation & ADRs
├── package.json                 # Monorepo root package.json
└── README.md
```

---

## 2. Authentication Architecture (Better Auth)

### 2.1 Component Boundaries
- **Auth Engine Host:** The Better Auth core engine is initialized on the **NestJS Backend (`apps/api`)** with direct access to the database via Prisma adapter.
- **Client Integration:** The Next.js frontend utilizes `@better-auth/client` pointing to `API_URL/api/v1/auth`.
- **Session Transport:**
  - Standard HTTP-only, `SameSite=Lax`, `Secure` cookies are used for web browser sessions.
  - In cross-origin local development (`localhost:3000` $\leftrightarrow$ `localhost:4000`), credentials are exchanged using `credentials: 'include'` with explicit CORS headers (never wildcard `*`).
  - Mobile or external programmatic access supports `Authorization: Bearer <token>`.

### 2.2 Security & CSRF
- Double-submit cookie or origin-header validation enforced by Better Auth and NestJS CORS configuration.
- Standard session revocation on logout invalidates the session record in the database immediately.

---

## 3. Backend Architecture (NestJS)

### 3.1 Layered Domain Separation
1. **Controllers (`*.controller.ts`):** HTTP routing, input deserialization, Swagger documentation, and response formatting. Zero database queries.
2. **Guards (`*.guard.ts`):**
   - `SessionAuthGuard`: Validates session existence and injects `UserContext`.
   - `WorkspaceAccessGuard`: Verifies that `workspaceId` extracted from params or headers belongs to an active membership of the authenticated user.
   - `RolesGuard`: Enforces RBAC permissions (`Owner`, `Admin`, `Member`, `Viewer`).
3. **Services (`*.service.ts`):** Business logic, transaction management, invariant validation, and domain event firing.
4. **Persistence Layer (`prisma.service.ts`):** Encapsulated database operations with Prisma 7.

### 3.2 Error Handling & Logging
- Centralized `GlobalExceptionFilter` maps NestJS `HttpException` and Prisma exceptions to standardized RFC 7807 Problem Details JSON format:
  ```json
  {
    "type": "https://api.workflow-ai.com/errors/invalid-transition",
    "title": "Invalid Status Transition",
    "status": 400,
    "detail": "Cannot transition issue from Done directly to In Review without reopening.",
    "instance": "/api/v1/workspaces/ws_1/issues/iss_12/transition",
    "timestamp": "2026-11-11T21:40:00Z"
  }
  ```

---

## 4. Frontend Architecture (Next.js 16)

### 4.1 State Management Division
- **Server Cache & Synchronization:** `TanStack Query v5` handles all server interactions, query caching, background revalidation, and optimistic mutations for the Kanban board and issue updates.
- **Client UI State:** `Zustand` stores transient client-only states:
  - Sidebar collapse/expand state.
  - Active board filters (assignee, priority, tag).
  - Selected issue ID for the active detail drawer.
  - Keyboard navigation focus index.

### 4.2 Optimistic Updates & Failure Rollback
When moving an issue card between Kanban columns:
1. `onMutate`: Cancel outgoing refetches, snapshot current cache, optimistically update the board column in the TanStack Query cache.
2. `onError`: Rollback cache to the snapshot and trigger a non-blocking toast notification explaining the rejection.
3. `onSettled`: Invalidate and sync with the backend.

---

## 5. Database & ORM Strategy

- **Database:** PostgreSQL 18.
- **ORM:** Prisma 7 with native PostgreSQL connection pool adapter.
- **Migrations:** Strictly version-controlled SQL migrations created via `prisma migrate dev` during development and deployed via `prisma migrate deploy` in CI/CD.
- **Connection Management:** Connection pooling configured with explicit min/max bounds to prevent pool exhaustion.
