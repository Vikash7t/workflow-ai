# Workflow AI — AI Architecture & Safety Specification

## 1. Core Principles & Design Goals
1. **Human-in-the-Loop Governance:** AI may read and synthesize data autonomously, but it can **never** execute state-modifying actions (create, edit, delete, reassign) without human review and confirmation.
2. **Provider-Agnostic Core:** Built on the **Vercel AI SDK**, isolating the application from vendor lock-in. Support Google Gemini 1.5 Pro/Flash, Anthropic Claude 3.5 Sonnet, and OpenAI models via simple environment configuration.
3. **Strict Structured Outputs:** All AI responses adhere to validated Zod schemas. Free-form text parsing for business actions is strictly forbidden.
4. **Deterministic Authorization Scoping:** AI tools execute using the active user's session context and RBAC permissions. The model has **zero direct access to the database or raw SQL execution**.

---

## 2. High-Level AI Pipeline

```
                                  [ User Request (Prompt / Meeting Notes) ]
                                                     │
                                                     ▼
                             ┌──────────────────────────────────────────────┐
                             │               AI Gateway Guard               │
                             │  - Rate Limiter (Token Bucket per workspace) │
                             │  - Input Sanitization & XML Demarcation      │
                             │  - Workspace Context & RBAC Boundary Check   │
                             └───────────────────────┬──────────────────────┘
                                                     │
                                                     ▼
                             ┌──────────────────────────────────────────────┐
                             │       Prompt Engine (Versioned Prompts)      │
                             │  - System Directives & Security Guardrails   │
                             │  - Authorized Context Ingestion (RAG)        │
                             └───────────────────────┬──────────────────────┘
                                                     │
                                                     ▼
                             ┌──────────────────────────────────────────────┐
                             │        Vercel AI SDK / Model Provider        │
                             │  - Google Gemini 1.5 Pro / Claude Sonnet     │
                             │  - Structured Output via Zod Schema          │
                             └───────────────────────┬──────────────────────┘
                                                     │
                                                     ▼
                             ┌──────────────────────────────────────────────┐
                             │           Output Validation Guard            │
                             │  - Zod Schema Parse                          │
                             │  - Token / Cost Logging to Database          │
                             └───────────────────────┬──────────────────────┘
                                                     │
                             ┌───────────────────────┴──────────────────────┐
                             ▼                                              ▼
                    [ Read-Only Query ]                           [ Mutation Action Plan ]
              Instant synthesized response                  Two-Phase Commit: User Review & Confirmation
```

---

## 3. Two-Phase Execution Pattern for Mutations

To prevent prompt injection from causing unauthorized state changes, all AI actions follow an immutable 2-phase lifecycle:

1. **Phase 1: Proposal Generation (Dry-Run)**
   - The user asks: *"Break down the authentication refactor and assign high-priority tasks to Alex"*.
   - The AI evaluates authorized project and team data.
   - The AI returns a **Structured Action Plan**:
     ```json
     {
       "action": "CREATE_ISSUES",
       "projectId": "proj_123",
       "items": [
         {
           "title": "Migrate to Better Auth Core",
           "type": "STORY",
           "priority": "P1",
           "assigneeId": "user_alex_id",
           "acceptanceCriteria": ["Session cookie validated by NestJS guard"]
         }
       ]
     }
     ```
   - The response is saved in a temporary `AISessionAction` record with an expiration TTL (15 minutes).
2. **Phase 2: Human Confirmation & Execution**
   - The user sees a visual preview in the UI and can edit, delete, or approve individual items.
   - Upon clicking **"Confirm & Create"**, the frontend sends the approved `actionId` to the backend.
   - The NestJS `IssuesService` validates that the user possesses `MEMBER` or `ADMIN` rights on `proj_123` and executes the creation inside a standard database transaction.

---

## 4. Usage, Cost & Rate-Limiting Controls
- **Workspace Quotas:** Configurable monthly AI token allowance per workspace.
- **Audit Logging (`ai_request_audits`):** Every generation records:
  - `workspaceId`, `userId`, `provider`, `model`, `promptTokens`, `completionTokens`, `estimatedCostUSD`, `latencyMs`, and `status`.
- **Timeouts & Retries:** Strict 30-second timeout on all LLM requests with exponential backoff on transient HTTP 429/503 errors (maximum 2 retries).
