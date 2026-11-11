# Workflow AI — Master Plan (Phase 0)

## Executive Summary
**Workflow AI** is an intelligent, predictive, AI-native project management SaaS platform engineered specifically for modern software development teams. It bridges the gap between high-level roadmapping, day-to-day issue execution, and software development lifecycle telemetry (commits, pull requests, CI/CD signals).

The primary architectural mandate is **rock-solid project management fundamentals first, intelligent assistive features second, and autonomous automation third**.

---

## 1. Core Principles & Philosophy
1. **Uncompromising Data Integrity:** Correct business logic, transactional invariants, and multi-tenant security precede all AI functionality.
2. **Deterministic Domain Rules Owned by Backend:** NestJS serves as the authoritative single source of truth for all business rules, authorization, status transitions, and data access. Next.js functions strictly as an interactive consumer/shell and never bypasses backend policies.
3. **Defense-in-Depth Security (OWASP Top 10):** Tenant isolation is enforced at every layer: database queries, service layers, API guards, and retrieval pipelines.
4. **Reliable, Scoped AI:** AI capabilities (task decomposition, copilot, risk scoring) operate through strictly authorized tools with human confirmation required for state mutations. AI is granted zero unrestricted database access.
5. **Phase-Gated Pragmatism:** No speculative complexity (no premature microservices, Kubernetes, or redundant caching tiers) until justified by explicit scale or feature demands.

---

## 2. System Architecture Blueprint

```
                               ┌──────────────────────────────────────────────────────────┐
                               │           Next.js 16 Client App (apps/web)               │
                               │  - React 19, TypeScript, Tailwind CSS 4, shadcn/ui        │
                               │  - TanStack Query (Server State), Zustand (Local UI)      │
                               │  - Better Auth Client Session Manager                    │
                               └────────────────────────────┬─────────────────────────────┘
                                                            │ HTTPS / CORS + Cookies / Bearer
                                                            ▼
                               ┌──────────────────────────────────────────────────────────┐
                               │             NestJS Modular API (apps/api)                │
                               │  - Better Auth Session Guard / RBAC Policy Middleware     │
                               │  - Workspace / Project / Issue Service Domains           │
                               │  - AI Gateway (Vercel AI SDK + Google Gemini/Anthropic)  │
                               │  - Audit Logger & Event Outbox Dispatcher                │
                               └──────────────┬─────────────────────────────┬─────────────┘
                                              │                             │
                     (Prisma ORM 7 + pg adapter)          (BullMQ / Inngest Worker Queue)
                                              ▼                             ▼
                               ┌──────────────────────────────┐ ┌─────────────────────────┐
                               │     PostgreSQL Database      │ │   Async Job Workers     │
                               │  - Multi-Tenant Schema       │ │  - Embedding generation │
                               │  - Foreign Key Cascades      │ │  - Webhook processing   │
                               │  - pgvector (Ph 9)           │ │  - Standup summaries    │
                               └──────────────────────────────┘ └─────────────────────────┘
```

---

## 3. High-Level Phase Overview
- **Phase 0:** Repository Audit, PRD Validation, Master Planning *(Current)*
- **Phase 1:** Monorepo Foundation & Tooling (`apps/web`, `apps/api`, `packages/contracts`)
- **Phase 2:** Authentication, Multi-Tenancy (Org/Workspace), and RBAC
- **Phase 3:** Core Project & Issue Management Engine (Backend Domain)
- **Phase 4:** Core Project Management UX (Kanban, List View, Issue Detail)
- **Phase 5:** Team Collaboration & Advanced Planning (Comments, Activity, Sprints, Dependencies)
- **Phase 6:** AI Foundation & Human-in-the-Loop Task Decomposition
- **Phase 7:** GitHub & GitLab Webhook Integration
- **Phase 8:** Conversational Project Copilot (Command Bar & Natural Language Queries)
- **Phase 9:** Semantic Search & Duplicate Detection (pgvector)
- **Phase 10:** Delivery Intelligence, Risk Forecasting & Executive Summaries
- **Phase 11:** Slack, Discord & External Ingestion Connectors
- **Phase 12:** Production Readiness, Performance Benchmarking & Hardening

---

## 4. Phase 0 Acceptance Criteria Verification
- [x] Repository inspected; clean working tree confirmed.
- [x] Contradictions and ambiguities identified and classified.
- [x] Tenant, authorization, and permission models explicitly specified.
- [x] Concurrency-safe issue numbering and customizable status transition rules designed.
- [x] OWASP Top 10 security mapping applied across all architectural tiers.
- [x] AI safety, tool invocation limits, and human-in-the-loop controls documented.
- [x] Comprehensive documentation generated in `docs/`.
