# ADR-0005: AI Tool Invocation, Guardrails, and Permission Isolation

## Status
Approved (Phase 0)

## Context
Integrating Large Language Models into a project management tool presents serious security risks:
1. Prompt injection from meeting notes or ticket descriptions.
2. Insecure output handling executing arbitrary actions or scripts.
3. Excessive agency where an AI hallucination modifies or deletes real issues.

## Decision
1. **Zero Direct DB Access:**
   - The LLM has zero direct SQL execution, database driver, or ORM access.
2. **Provider Abstraction via Vercel AI SDK:**
   - Models are swappable via configuration (Google Gemini 1.5 Pro / Flash, Claude 3.5 Sonnet).
3. **Structured Outputs Enforced by Zod:**
   - All AI generation targets strictly validated Zod schemas. Any payload failing validation is immediately discarded.
4. **Mandatory Two-Phase Confirmation for Mutations:**
   - Read operations (summaries, risk queries) are executed directly and reported back.
   - Any write operation (issue creation, status update, reassignment) generates an **Action Plan Preview** that requires explicit human confirmation in the UI before execution.
5. **Authorization Boundary:**
   - When the user confirms an AI-proposed action, the backend invokes the standard `IssuesService` using the **human user's active session and RBAC credentials**, ensuring all permissions and validation rules are re-verified.

## Consequences
- **Positive:** Immune to autonomous prompt-injection-driven data destruction; maintains full audit trail of human confirmations.
- **Negative:** Adds a human review step for automated actions, which is the intended safe behavior.
