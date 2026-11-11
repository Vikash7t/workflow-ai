# Workflow AI — Implementation Roadmap (Phases 0–12)

This document establishes the official execution sequence for Workflow AI.
Each phase contains strict scope boundaries, entry prerequisites, deliverables, and acceptance criteria.
**Transitions between phases require explicit stakeholder sign-off.**

---

## Phase Summary Table

| Phase | Title | Primary Objective | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 0** | **Audit & Master Planning** | Establish architecture, security, and PRD alignment | `docs/` specifications, ADRs, risk register *(Current)* |
| **Phase 1** | **Monorepo & Foundation** | Initialize developer tooling, monorepo, and API skeleton | Turborepo / npm workspaces, `apps/web`, `apps/api`, Prisma 7 |
| **Phase 2** | **Auth, Tenancy & RBAC** | Identity, session lifecycle, and workspace isolation | Better Auth, Organizations, Workspaces, RBAC Guards |
| **Phase 3** | **Issue Management Engine** | Backend domain logic, issue hierarchy, and numbering | Issue CRUD, atomic counters, customizable workflows, tests |
| **Phase 4** | **Core Management UX** | Interactive client shell, Kanban, and List views | Next.js App, TanStack Query, drag-and-drop board, table view |
| **Phase 5** | **Collaboration & Sprints** | Team interaction, dependencies, and cycle planning | Comments, activity logs, sprint planning, dependency DAGs |
| **Phase 6** | **AI Task Decomposition** | Structured breakdown of notes into Epics and Stories | Vercel AI SDK, Zod schemas, two-phase confirmation UI |
| **Phase 7** | **GitHub / GitLab Sync** | Connect code activity to issue tracking | Inbound webhooks, HMAC verification, PR linking, auto-close |
| **Phase 8** | **Project Copilot** | Natural language query and action bar | Conversational UI, tool definitions, confirmed mutations |
| **Phase 9** | **Semantic Search & Dups** | Intelligent retrieval and duplicate detection | PostgreSQL pgvector, embedding jobs, tenant-scoped search |
| **Phase 10** | **Delivery Intelligence** | Risk forecasting, bottleneck alerts, standup generation | Velocity metrics, SLA breaches, automated daily standups |
| **Phase 11** | **External Ingestion** | Ingest tasks from Slack, Discord, and transcripts | Slack Bot, Discord webhooks, message-to-issue extraction |
| **Phase 12** | **Production Hardening** | Enterprise security, performance, and readiness | OWASP audit, load tests, Docker setup, CI/CD deployment |

---

## Detailed Phase Breakdown

### Phase 0: Audit & Master Planning *(Current)*
- **Objective:** Plan and validate the entire system without writing application code.
- **Deliverables:** Architectural specifications, domain models, OWASP Top 10 security strategy, AI architecture, ADRs.
- **Acceptance:** Complete consensus on technical blueprint and approval to begin Phase 1.

### Phase 1: Monorepo & Engineering Foundation
- **Objective:** Establish the development environment, package manager, and base configurations.
- **Scope:**
  - Workspace configuration (`apps/web`, `apps/api`, `packages/contracts`, `packages/config`).
  - Next.js 16 + React 19 App Router setup.
  - NestJS 12 + TypeScript setup.
  - PostgreSQL 18 connection verification and Prisma 7 initialization.
  - Shared ESLint, Prettier, and TypeScript configs.
  - Health check endpoints (`/health/live`, `/health/ready`).
  - Swagger/OpenAPI setup on NestJS.
- **Acceptance:** Both applications boot locally; health check passes; database connection succeeds; CI lint/build passes.

### Phase 2: Auth, Tenancy & RBAC
- **Objective:** Build robust multi-tenant authentication and permission enforcement.
- **Scope:**
  - Better Auth setup in NestJS with PostgreSQL Prisma adapter.
  - Email passwordless authentication + GitHub & Google OAuth.
  - Organization and Workspace creation and switching.
  - Workspace invitations and role assignments (`Owner`, `Admin`, `Member`, `Viewer`).
  - `SessionAuthGuard` and `WorkspaceAccessGuard` in NestJS.
- **Acceptance:** Full tenant isolation verified: users cannot access workspaces they are not members of; RBAC permissions tested against BOLA/IDOR attacks.

### Phase 3: Core Issue Management Engine (Backend)
- **Objective:** Build the core project management domain logic.
- **Scope:**
  - Project management with unique project keys (e.g. `ENG`).
  - Atomic sequence counter for issue numbering (`ENG-101`).
  - Unified issue model: `EPIC`, `STORY`, `TASK`, `BUG`, `SUBTASK`.
  - Customizable workflow statuses with ordered positions and categories.
  - Status transition validation engine.
  - Filtering, pagination, and bulk issue updates.
- **Acceptance:** All issue operations tested via automated integration tests; race conditions in numbering prevented under concurrency.

### Phase 4: Core Project Management UX
- **Objective:** Build the user-facing project and issue interfaces.
- **Scope:**
  - Application layout: sidebar, workspace switcher, project selector.
  - Drag-and-drop Kanban board with optimistic updates and error rollback.
  - High-density List/Table view with column sorting and multi-select.
  - Issue detail drawer with instant property updates.
  - Keyboard shortcuts (`Cmd+K`, quick issue creation).
- **Acceptance:** Board and list views render smoothly; card movement is snappy and synchronized with backend; state is resilient across page reloads.

### Phase 5: Collaboration & Advanced Planning
- **Objective:** Enable team collaboration, sprints, and dependency tracking.
- **Scope:**
  - Issue comments with rich markdown and editing permissions.
  - Chronological activity log for all issue mutations.
  - Sprint / Cycle management (start date, end date, status, issue rollover).
  - Issue dependencies (`BLOCKS`, `BLOCKED_BY`) with circular dependency detection.
  - In-app notification center.
- **Acceptance:** Dependencies reject cycles; sprint lifecycles correctly transition issues; comments and activity history update accurately.

### Phase 6: AI Infrastructure & Task Decomposition
- **Objective:** Provide human-in-the-loop AI assistance for issue planning.
- **Scope:**
  - Vercel AI SDK integration in NestJS with Google Gemini / Anthropic providers.
  - Task decomposition service: input raw text/meeting notes $\rightarrow$ structured Epics, Stories, and Acceptance Criteria.
  - Zod output validation.
  - Interactive preview and approval UI before creating records.
  - Rate limiting, token usage logging, and cost tracking.
- **Acceptance:** AI produces valid structured issue hierarchies; user can edit/approve items before insertion; zero untracked model executions.

### Phase 7: GitHub & GitLab Integration
- **Objective:** Synchronize software development activity with project issues.
- **Scope:**
  - Webhook ingestion endpoints with HMAC-SHA256 signature verification.
  - Extraction of issue keys from branch names, commit messages, and PR titles.
  - Automatic status updates (e.g., PR open $\rightarrow$ In Review; PR merged $\rightarrow$ Done).
  - Idempotent webhook event queue to prevent duplicate processing.
- **Acceptance:** PR events update matching issues according to workspace rules; unauthenticated or forged webhooks are rejected.

### Phase 8: Conversational Project Copilot
- **Objective:** Provide a natural language assistant for querying and updating projects.
- **Scope:**
  - Command bar AI assistant (`Cmd+K`).
  - Scoped read operations: sprint summaries, blocker identification, overdue queries.
  - Two-phase mutation engine: AI proposes action plan $\rightarrow$ user confirms $\rightarrow$ backend executes.
  - Strictly enforced user authorization on all tool executions.
- **Acceptance:** Copilot answers questions accurately based on current data; cannot execute unauthorized changes or bypass business rules.

### Phase 9: Semantic Search & Duplicate Detection
- **Objective:** Prevent redundant issues and enable semantic discovery.
- **Scope:**
  - PostgreSQL `pgvector` extension setup.
  - Asynchronous embedding generation for issue titles and descriptions.
  - Duplicate issue detection upon ticket drafting.
  - Tenant-scoped semantic similarity queries.
- **Acceptance:** System detects similar/duplicate issues in real time with high accuracy without cross-tenant information disclosure.

### Phase 10: Delivery Intelligence & Standup Reports
- **Objective:** Provide predictive insights and automated reporting.
- **Scope:**
  - Deterministic metrics: cycle time, lead time, PR review latency, bottleneck indicators.
  - Evidence-backed risk detection for sprints and overdue milestones.
  - Automated asynchronous daily and weekly standup report generator.
- **Acceptance:** All metrics are traceable to underlying records; no hallucinated predictions.

### Phase 11: External Ingestion (Slack & Discord)
- **Objective:** Expand issue creation into team communication hubs.
- **Scope:**
  - Slack App & Discord Bot connectors.
  - Emoji reactions / slash commands to convert messages into issue drafts.
  - Channel-to-project routing.
- **Acceptance:** Team members can convert discussions into structured issues with verified author attribution.

### Phase 12: Production Readiness & Release Hardening
- **Objective:** Prepare the platform for enterprise-grade deployment.
- **Scope:**
  - End-to-end OWASP Top 10 security audit and penetration testing.
  - Performance profiling, query index optimization, and connection pool tuning.
  - Docker containerization and CI/CD pipelines (GitHub Actions).
  - Disaster recovery, backup strategies, and production observability (Prometheus/Grafana/OpenTelemetry).
- **Acceptance:** System achieves sub-100ms API response times (p95); zero critical security vulnerabilities; automated zero-downtime deployment.
