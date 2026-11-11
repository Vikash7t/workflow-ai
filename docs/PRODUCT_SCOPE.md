# Workflow AI — Product Scope & PRD Analysis

## 1. Requirement Classification

Decisions and capabilities are partitioned into four strict categories:
1. **Explicit PRD Requirements:** Capabilities mandated by the initial product statement.
2. **Recommended Architectural Decisions:** Engineering best practices necessary to realize the requirements safely.
3. **Assumptions Requiring Confirmation:** Ambiguities where sensible defaults are proposed.
4. **Deferred Scope:** Capabilities intentionally reserved for post-MVP phases.

---

## 2. PRD Gaps, Ambiguities & Technical Contradictions Identified

### 2.1 Monolithic Next.js vs. Separate NestJS Backend
- **Initial PRD Suggestion:** The initial draft suggested standard Next.js fullstack Server Actions / API routes.
- **Architectural Directive:** NestJS must own all backend business rules, transaction boundaries, and authorization logic; Next.js serves purely as the frontend shell.
- **Resolution:** Dedicated monorepo structure (`apps/web` for Next.js, `apps/api` for NestJS). Shared TypeScript contracts in `packages/contracts`.

### 2.2 Organization vs. Workspace Relationship & Tenancy Hierarchy
- **PRD Ambiguity:** The PRD mentions Organizations and Workspaces interchangeably in places without clarifying membership inheritance.
- **Resolution:** A strict 2-tier tenancy model:
  - An **Organization** is the top-level legal and billing entity (e.g., "Acme Corp").
  - A **Workspace** is an isolated operational environment (e.g., "Engineering", "Design", or "Client Alpha").
  - Organization membership grants identity and billing association, but **workspace data access requires explicit Workspace Membership**. Being an Organization Member does not automatically leak internal workspace issues unless granted or unless the user holds the Organization `Owner` or `Admin` role.

### 2.3 Status Enum vs. Customizable Workflow Lanes
- **Contradiction:** The initial database draft suggested a static enum `status VARCHAR(50) DEFAULT 'todo'` (backlog, todo, in_progress, in_review, done). However, modern engineering teams require custom statuses and transition gates.
- **Resolution:** Statuses are modeled as relational entities (`WorkflowStatus`) scoped to a Workspace or Project, with defined `Category` types (`BACKLOG`, `UNSTARTED`, `STARTED`, `COMPLETED`, `CANCELLED`) and configurable transition rules.

### 2.4 Issue Numbering & High-Concurrency Race Conditions
- **PRD Omission:** The PRD specified human-readable keys like `ENG-101` but omitted concurrency protection.
- **Resolution:** Sequential numbering cannot rely on `SELECT MAX(issue_number) + 1` due to race conditions during concurrent issue creation. Numbering will be handled using atomic project-level sequence counters (`UPDATE projects SET issue_counter = issue_counter + 1 RETURNING issue_counter`) within database transactions.

### 2.5 Real-Time Synchronization Architecture
- **Contradiction:** The PRD mentioned Supabase Realtime, yet the system uses an independent NestJS + PostgreSQL backend.
- **Resolution:** Supabase Realtime introduces dual-source-of-truth friction. For MVP, we utilize robust HTTP polling / optimistic UI updates with TanStack Query. Real-time updates will be introduced in Phase 5 via NestJS WebSocket gateways (Socket.io) or Server-Sent Events (SSE).

---

## 3. Prioritized Feature Scope

### 3.1 Phase 1–4: Core MVP Scope (The Foundation)
1. **Multi-Tenant Authentication & Session Management:**
   - Better Auth integration, email passwordless/magic link, GitHub and Google OAuth.
   - Organization and Workspace creation, member invitations, and role-based permissions (`Owner`, `Admin`, `Member`, `Viewer`).
2. **Project & Issue Management Engine:**
   - Projects with unique identifiers (e.g. `ENG`, `PLAT`).
   - Unified Issue domain supporting types: `EPIC`, `STORY`, `TASK`, `BUG`, `SUBTASK`.
   - Concurrency-safe issue numbering (`ENG-1`, `ENG-2`).
   - Prioritization (`P0-Critical`, `P1-High`, `P2-Medium`, `P3-Low`), assignees, reporters, estimates, due dates, and tags.
   - Customizable workflow statuses with ordered board columns.
3. **High-Performance Project Management UX:**
   - Linear-inspired, high-density keyboard-friendly UI.
   - Interactive Drag-and-Drop Kanban Board with optimistic updates and failure rollback.
   - High-density List/Table View with multi-column sorting, filtering, and search.
   - Issue detail drawer with instant property editing.

### 3.2 Phase 5–8: Collaboration & AI Integration
- Issue comments, @mentions, and audit activity streams.
- Sprints/Cycles and issue dependencies (blocks / blocked-by with acyclic graph validation).
- Structured AI Task Decomposition (converts briefs into Epics, Stories, and Acceptance Criteria with human review preview).
- GitHub App webhook integration (PR linking, commit tracking, automated issue closure).
- Conversational Project Copilot (scoped natural language queries and two-phase confirmed write operations).

### 3.3 Phase 9–12: Advanced Intelligence & Enterprise Hardening
- Semantic search and duplicate issue detection via `pgvector`.
- Predictive delivery risk forecasting, bottleneck alerts, and automated standup generation.
- Slack & Discord bi-directional issue ingestion.
- Enterprise hardening, OWASP Top 10 remediation verification, and performance profiling.

---

## 4. Explicitly Deferred Features
- SAML / Single Sign-On (SSO) and SCIM provisioning (deferred to post-v1 enterprise tier).
- Credit card billing and subscription metering (Stripe integration deferred until core product flows are validated).
- Complex custom plugin scripting engines (triggers and actions will be declarative only).
- Native mobile applications (responsive mobile web shell is prioritized).
