# ADR-0004: Unified Issue Hierarchy and Concurrency-Safe Identifiers

## Status
Approved (Phase 0)

## Context
Project management platforms require intuitive, human-friendly keys (e.g. `ENG-101`) and a multi-level work breakdown structure (Epics, Stories, Tasks, Bugs, Subtasks).
Two critical failure modes must be avoided:
1. Fragmented database tables for each issue type causing unwieldy joins and schema sprawl.
2. Race conditions causing duplicate issue keys under concurrent requests.

## Decision
1. **Single Unified `Issue` Model:**
   - All work items are stored in the `issues` table with an `issueType` discriminator (`EPIC`, `STORY`, `TASK`, `BUG`, `SUBTASK`).
   - Self-referencing foreign key (`parentId`) models the hierarchy.
   - Business rules enforced in `IssuesService`:
     - `SUBTASK` must have a parent `TASK`, `STORY`, or `BUG`.
     - `EPIC` cannot be a subtask.
     - Maximum nesting depth is strictly enforced (2 levels: Epic $\rightarrow$ Standard Issue $\rightarrow$ Subtask).
2. **Atomic Project Sequence Counter:**
   - Every `Project` has an integer column `issueCounter`.
   - Issue creation runs in an isolated transaction:
     ```sql
     UPDATE projects 
     SET issue_counter = issue_counter + 1 
     WHERE id = $projectId 
     RETURNING issue_counter;
     ```
   - The returned number is concatenated with the project key to produce `key = "${project.key}-${issueCounter}"`.
   - A unique database index `@@unique([projectId, issueNumber])` acts as a fail-safe.

## Consequences
- **Positive:** Guarantees zero duplicate issue keys even under peak concurrency; unified issue model simplifies board views, filtering, and search.
- **Negative:** Row-level lock on `projects` during the transaction, which is acceptable at standard SaaS team write volumes.
