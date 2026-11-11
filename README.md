# Workflow AI

> **Intelligent, Predictive, AI-Native Project Management SaaS**  
> An engineering-first platform that connects product roadmaps, day-to-day issue execution, and SDLC telemetry into an autonomous, context-aware project command center.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Architecture: Monorepo](https://img.shields.io/badge/Architecture-Modular%20Monorepo-purple.svg)](#architecture--tech-stack)
[![Backend: NestJS 12](https://img.shields.io/badge/Backend-NestJS%2012-E0234E.svg)](#architecture--tech-stack)
[![Frontend: Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-black.svg)](#architecture--tech-stack)
[![Database: PostgreSQL 18](https://img.shields.io/badge/Database-PostgreSQL%2018%20%2B%20Prisma%207-336791.svg)](#architecture--tech-stack)
[![Security: OWASP Top 10](https://img.shields.io/badge/Security-OWASP%20Top%2010%20Hardened-green.svg)](#security--governance)

---

## 📖 About Workflow AI

Modern software development teams face severe administrative fatigue. Engineers and managers spend hours each week grooming backlogs, estimating tickets, writing status updates, and triaging customer bugs across disconnected tools (Jira, Slack, GitHub, Notion). By the time sprint reviews arrive, blockers and scope creep have already caused deadlines to slip.

**Workflow AI** re-engineers project management around the modern software development lifecycle. Rather than acting as a static record keeper, Workflow AI serves as an **autonomous engineering partner**:

- **Bridges the Gap Between Code and Tasks:** Automatically correlates Git branches, commits, and pull requests to issues, transitioning tickets autonomously based on verified engineering activity.
- **Eliminates Manual Backlog Grooming:** Ingests unorganized RFCs, product briefs, customer feedback, and meeting transcripts, decomposing them into structured Epics, Stories, and Gherkin-syntax acceptance criteria.
- **Predicts Delivery Delays:** Continuously evaluates cycle times, PR review latency, and blocked dependency chains to alert engineering leads to bottlenecks before they breach SLAs.
- **Conversational Project Copilot:** Enables natural language querying across team velocity, blockers, and project health, with human-in-the-loop controls for safe task mutations.

---

## 👥 Target Personas

| Persona | Primary Workflow | Key Problem Solved |
| :--- | :--- | :--- |
| **Engineering Leaders & VP of Eng** | Milestone tracking, velocity forecasting, bottleneck analysis | Eliminates manual status gathering; surfaces stalled PRs and at-risk deliverables early. |
| **Product Managers (PMs)** | PRD-to-issue breakdown, acceptance criteria, backlog prioritization | Converts high-level product specifications and meeting notes into developer-ready tickets in seconds. |
| **Software Engineers (ICs)** | Fast keyboard-first issue navigation, Git sync, contextual task briefs | Zero context-switching: PRs automatically link and advance issues without manual status toggling. |

---

## 🏛️ Core Capabilities

### 1. High-Performance Project Engine
- **Hierarchical Domain:** Multi-tenant hierarchy supporting `Organization` $\rightarrow$ `Workspace` $\rightarrow$ `Project` $\rightarrow$ `Epic` $\rightarrow$ `Story / Task / Bug` $\rightarrow$ `Subtask`.
- **Concurrency-Safe Numbering:** Atomic database counters generate human-friendly identifiers (`ENG-101`) without race conditions.
- **Interactive Views:**
  - **Kanban Board:** Fluid drag-and-drop workflow with customizable lanes and optimistic UI updates.
  - **High-Density Table View:** Fast, keyboard-accessible list view with multi-column filtering and bulk operations.
  - **Timeline / Dependencies:** Directed Acyclic Graph (DAG) dependency management with circular dependency detection.
- **Custom Workflows:** Dynamic workflow statuses with categorized lifecycle states (`BACKLOG`, `UNSTARTED`, `STARTED`, `COMPLETED`, `CANCELLED`).

### 2. AI Intelligence Layer
- **Autonomous Task Decomposition:** Converts feature descriptions and meeting notes into structured hierarchies.
- **Two-Phase Action Commit:** The model produces an actionable preview; state changes are only executed upon explicit user confirmation.
- **Duplicate & Overlap Detection:** Semantic vector search prevents redundant bug reports and issues.
- **Conversational Copilot:** Instant answers to project health queries (*"What's blocking the Auth v2 release?"*).
- **Asynchronous Standups:** Automated daily standup digests synthesizing closed PRs and pending blockers.

### 3. Developer Ecosystem Integrations
- **GitHub & GitLab:** Inbound webhook processing with HMAC-SHA256 signature verification, branch linking, and PR-to-issue state transitions.
- **Slack & Discord:** Ingestion connectors allowing teams to convert chat discussions into tracked issues with verified attribution.

---

## 💻 Architecture & Tech Stack

```
                              ┌──────────────────────────────────────────────────────────┐
                              │            Next.js 16 Client App (apps/web)              │
                              │  - React 19, TypeScript, Tailwind CSS 4, shadcn/ui        │
                              │  - TanStack Query (Server State), Zustand (Local UI)      │
                              │  - Better Auth Client Session Manager                    │
                              └────────────────────────────┬─────────────────────────────┘
                                                           │ HTTPS / CORS + Cookies
                                                           ▼
                              ┌──────────────────────────────────────────────────────────┐
                              │              NestJS Modular API (apps/api)               │
                              │  - SessionAuthGuard & WorkspaceAccessGuard (RBAC)        │
                              │  - Issue, Project, and Workflow Domain Services          │
                              │  - AI Gateway (Vercel AI SDK + Google Gemini/Anthropic)  │
                              │  - GlobalExceptionFilter (RFC 7807 Problem Details)      │
                              └──────────────┬─────────────────────────────┬─────────────┘
                                             │                             │
                    (Prisma ORM 7 + pg adapter)             (BullMQ / Inngest Worker Queue)
                                             ▼                             ▼
                              ┌──────────────────────────────┐ ┌─────────────────────────┐
                              │     PostgreSQL Database      │ │   Async Job Workers     │
                              │  - Multi-Tenant Schema       │ │  - Embedding generation │
                              │  - Foreign Key Cascades      │ │  - Webhook processing   │
                              │  - pgvector (Ph 9)           │ │  - Standup summaries    │
                              └──────────────────────────────┘ └─────────────────────────┘
```

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Monorepo Management** | npm Workspaces | Native package workspace management without unnecessary external tooling. |
| **Frontend Framework** | **Next.js 16 (React 19)** | Fast server-side rendering, App Router layout nesting, and modern web vitals. |
| **UI & Styling** | **Tailwind CSS 4 + shadcn/ui** | High-density, accessible UI components with full keyboard and dark mode support. |
| **State Management** | **TanStack Query v5 + Zustand** | Optimistic UI mutations for drag-and-drop operations; clean separation of UI state. |
| **Backend Framework** | **NestJS 12 (Node.js 22 LTS)** | Modular domain architecture, OpenAPI/Swagger contracts, and robust guard middleware. |
| **Database & ORM** | **PostgreSQL 18 + Prisma ORM 7** | Transactional integrity, automated migrations, and `@prisma/adapter-pg` driver. |
| **Authentication** | **Better Auth** | Passwordless magic links, GitHub & Google OAuth, secure `HttpOnly` cookie sessions. |
| **AI Integration** | **Vercel AI SDK + Google Gemini** | Provider-agnostic LLM gateway, structured outputs with Zod, and rate-limiting controls. |

---

## 🔒 Security & Governance (OWASP Top 10 Hardened)

Workflow AI treats multi-tenant security as an absolute prerequisite:
- **Tenant Isolation (OWASP A01):** Every API request is checked against the authenticated user's workspace membership via NestJS guards. All database queries append `workspaceId`.
- **Two-Phase AI Commit (OWASP LLM08):** Language models have zero direct database write or raw SQL privileges. All mutations require human review and confirmation.
- **Prompt Injection Defense (OWASP LLM01):** Untrusted input is strictly enclosed in demarcated XML delimiters with system prompt guardrails.
- **Cryptographic Security (OWASP A02):** OAuth tokens and secrets are encrypted at rest using AES-256-GCM.
- **Webhook Integrity (OWASP A08):** Inbound webhooks require HMAC-SHA256 signature verification before processing.

---

## 🗺️ Project Roadmap (Phases 0–12)

- [x] **Phase 0: Audit & Master Planning** *(Architecture, Data Model, Security Strategy, ADRs)*
- [ ] **Phase 1: Monorepo Foundation & Tooling** *(Next.js 16, NestJS 12, Prisma 7, PostgreSQL)*
- [ ] **Phase 2: Auth, Tenancy & RBAC** *(Better Auth, Organizations, Workspaces, Role Guards)*
- [ ] **Phase 3: Core Issue Management Engine** *(Unified Issue Hierarchy, Atomic Counter, Custom Workflows)*
- [ ] **Phase 4: Core Project Management UX** *(Kanban Board, List View, Issue Detail Drawer)*
- [ ] **Phase 5: Collaboration & Advanced Planning** *(Comments, Activity Logs, Sprints, Dependencies)*
- [ ] **Phase 6: AI Infrastructure & Task Decomposition** *(Notes-to-Issue Generator, Zod Schemas)*
- [ ] **Phase 7: GitHub & GitLab Integration** *(Branch/PR Linking, Automated State Sync)*
- [ ] **Phase 8: Conversational Project Copilot** *(Natural Language Queries & Confirmed Mutations)*
- [ ] **Phase 9: Semantic Search & Duplicate Detection** *(pgvector Embeddings, Similarity Radar)*
- [ ] **Phase 10: Delivery Intelligence & Standup Reports** *(Velocity Metrics, Bottlenecks, Daily Standups)*
- [ ] **Phase 11: External Ingestion Connectors** *(Slack Bot, Discord Webhooks)*
- [ ] **Phase 12: Production Readiness & Release Hardening** *(OWASP Audit, Load Testing, Docker CI/CD)*

---

## 📚 Architectural Documentation

Complete specifications and architectural decision records are maintained in the [`docs/`](docs/) directory:
- [**Master Plan**](docs/MASTER_PLAN.md): Core principles and phase execution model.
- [**Product Scope**](docs/PRODUCT_SCOPE.md): PRD analysis, feature prioritization, and deferred capabilities.
- [**Architecture Specification**](docs/ARCHITECTURE.md): Frontend, backend, auth, and state architecture.
- [**Domain Data Model**](docs/DATA_MODEL.md): Relational schemas, ERD, and concurrency-safe patterns.
- [**Security Strategy**](docs/SECURITY_STRATEGY.md): OWASP Top 10 mitigation matrix and RBAC rules.
- [**AI Architecture**](docs/AI_ARCHITECTURE.md): LLM safety guardrails, Zod schemas, and two-phase commits.
- [**Implementation Roadmap**](docs/IMPLEMENTATION_ROADMAP.md): Detailed phase gates and acceptance criteria.
- [**Architecture Decision Records (ADRs)**](docs/decisions/):
  - [ADR-0001: Better Auth Integration Architecture](docs/decisions/ADR-0001-better-auth-nestjs-nextjs-integration.md)
  - [ADR-0002: Multi-Tenant Isolation & RBAC](docs/decisions/ADR-0002-multi-tenant-isolation-and-rbac.md)
  - [ADR-0003: Prisma ORM 7 & PostgreSQL 18](docs/decisions/ADR-0003-prisma-orm-7-and-postgres18.md)
  - [ADR-0004: Unified Issue Hierarchy & Concurrency-Safe Identifiers](docs/decisions/ADR-0004-issue-hierarchy-and-identifiers.md)
  - [ADR-0005: AI Tool Invocation & Security Guardrails](docs/decisions/ADR-0005-ai-tool-invocation-and-security.md)

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
