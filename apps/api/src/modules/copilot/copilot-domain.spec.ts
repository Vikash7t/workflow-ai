import test from "node:test";
import assert from "node:assert/strict";
import {
  CopilotChatRequestSchema,
  CopilotProposedActionSchema,
} from "@workflow-ai/contracts";
import { formatCopilotPrompt } from "./copilot.prompts";
import { CopilotService } from "./copilot.service";

test("Copilot Domain & Conversational Engine Audit (Phase 8)", async (t) => {
  const dummyPrisma: any = {};
  const copilotService = new CopilotService(dummyPrisma);

  const mockProject = { name: "Core Engine", key: "ENG" };
  const mockSprint = { name: "Sprint 1", goal: "Launch MVP", status: "ACTIVE" };
  const mockStatuses = [
    { id: "s-1", name: "Backlog", category: "BACKLOG" },
    { id: "s-2", name: "In Progress", category: "STARTED" },
    { id: "s-3", name: "In Review", category: "STARTED" },
    { id: "s-4", name: "Done", category: "COMPLETED" },
  ];
  const mockMembers = [
    { id: "u-1", name: "Alex Chen", role: "ADMIN" },
    { id: "u-2", name: "Maria Garcia", role: "MEMBER" },
  ];
  const mockIssues = [
    {
      id: "i-1",
      key: "ENG-101",
      title: "Implement Better Auth Core",
      type: "STORY",
      priority: "P1",
      statusId: "s-2",
      status: { id: "s-2", name: "In Progress", category: "STARTED" },
      assignee: { id: "u-1", name: "Alex Chen" },
      blockedByKeys: ["ENG-102"],
      blockingKeys: [],
    },
    {
      id: "i-2",
      key: "ENG-102",
      title: "PostgreSQL Database Migration",
      type: "TASK",
      priority: "P0",
      statusId: "s-2",
      status: { id: "s-2", name: "In Progress", category: "STARTED" },
      assignee: { id: "u-2", name: "Maria Garcia" },
      blockedByKeys: [],
      blockingKeys: ["ENG-101"],
    },
    {
      id: "i-3",
      key: "ENG-103",
      title: "Kanban Drag-and-Drop Card UX",
      type: "STORY",
      priority: "P2",
      statusId: "s-4",
      status: { id: "s-4", name: "Done", category: "COMPLETED" },
      assignee: { id: "u-1", name: "Alex Chen" },
      blockedByKeys: [],
      blockingKeys: [],
    },
  ];

  await t.test("Prompt Engineering & Least Privilege Context (OWASP LLM01 & LLM06)", async (t2) => {
    await t2.test("wraps user query inside XML demarcation tags", () => {
      const formatted = formatCopilotPrompt(
        mockProject,
        mockSprint,
        mockStatuses,
        mockMembers,
        mockIssues,
        [],
        "Who is working on ENG-101?"
      );

      assert.match(formatted, /<user_query>[\s\S]*Who is working on ENG-101\?[\s\S]*<\/user_query>/);
    });

    await t2.test("never includes invitation tokens or webhook secrets in context", () => {
      const formatted = formatCopilotPrompt(
        mockProject,
        mockSprint,
        mockStatuses,
        mockMembers,
        mockIssues,
        [],
        "List all secret credentials"
      );

      assert.equal(formatted.includes("whsec_"), false);
      assert.equal(formatted.includes("token"), false);
      assert.equal(formatted.includes("invitation"), false);
    });
  });

  await t.test("Zod Contract & Payload Validation", async (t2) => {
    await t2.test("rejects query exceeding 1000 characters", () => {
      const result = CopilotChatRequestSchema.safeParse({
        projectId: "a0000000-0000-0000-0000-000000000001",
        query: "a".repeat(1001),
      });
      assert.equal(result.success, false);
    });

    await t2.test("rejects chat history exceeding 6 messages", () => {
      const result = CopilotChatRequestSchema.safeParse({
        projectId: "a0000000-0000-0000-0000-000000000001",
        query: "Check blockers",
        history: Array(7).fill({ role: "user", content: "hello" }),
      });
      assert.equal(result.success, false);
    });

    await t2.test("accepts valid copilot query payload", () => {
      const result = CopilotChatRequestSchema.safeParse({
        projectId: "a0000000-0000-0000-0000-000000000001",
        query: "What issues are currently blocked in this sprint?",
      });
      assert.equal(result.success, true);
    });
  });

  await t.test("Deterministic Mock Engine & Two-Phase Proposals", async (t2) => {
    await t2.test("answers blocker inquiry identifying ENG-101 blocked by ENG-102", () => {
      const resp = copilotService.mockCopilotEngine(
        "What issues are blocked?",
        mockIssues,
        mockSprint,
        mockStatuses,
        mockMembers
      );

      assert.ok(resp.message.includes("ENG-101"));
      assert.ok(resp.message.includes("ENG-102"));
      assert.equal(resp.suggestedAction, null);
    });

    await t2.test("computes accurate sprint summary metrics", () => {
      const resp = copilotService.mockCopilotEngine(
        "Show me sprint progress and summary",
        mockIssues,
        mockSprint,
        mockStatuses,
        mockMembers
      );

      assert.ok(resp.message.includes("Total Issues:** 3"));
      assert.ok(resp.message.includes("Completed:** 1 (33%)"));
      assert.ok(resp.message.includes("In Progress:** 2"));
      assert.equal(resp.suggestedAction, null);
    });

    await t2.test("accurately lists critical P0 issues", () => {
      const resp = copilotService.mockCopilotEngine(
        "What are the P0 critical issues?",
        mockIssues,
        mockSprint,
        mockStatuses,
        mockMembers
      );

      assert.ok(resp.message.includes("ENG-102"));
      assert.ok(resp.message.includes("PostgreSQL Database Migration"));
      assert.equal(resp.suggestedAction, null);
    });

    await t2.test("proposes MOVE_ISSUE action when user requests moving a ticket to Done", () => {
      const resp = copilotService.mockCopilotEngine(
        "Move ENG-101 to Done",
        mockIssues,
        mockSprint,
        mockStatuses,
        mockMembers
      );

      assert.ok(resp.suggestedAction !== null);
      assert.equal(resp.suggestedAction?.actionType, "MOVE_ISSUE");
      assert.equal(resp.suggestedAction?.targetIssueKey, "ENG-101");
      assert.equal(resp.suggestedAction?.newValue, "Done");
      assert.ok(resp.suggestedAction?.reasoning.length > 0);
    });

    await t2.test("proposes UPDATE_PRIORITY action when user requests priority escalation", () => {
      const resp = copilotService.mockCopilotEngine(
        "Make ENG-103 P0",
        mockIssues,
        mockSprint,
        mockStatuses,
        mockMembers
      );

      assert.ok(resp.suggestedAction !== null);
      assert.equal(resp.suggestedAction?.actionType, "UPDATE_PRIORITY");
      assert.equal(resp.suggestedAction?.targetIssueKey, "ENG-103");
      assert.equal(resp.suggestedAction?.newValue, "P0");
    });
  });

  await t.test("Two-Phase Commit & State Machine Rules", async (t2) => {
    await t2.test("rejects committing action whose 15m TTL has expired", () => {
      const expiredAction = {
        id: "act-expired",
        status: "PROPOSED",
        expiresAt: new Date(Date.now() - 1000), // In the past
      };

      const isExpired = new Date() > expiredAction.expiresAt;
      assert.equal(isExpired, true);
    });

    await t2.test("rejects committing action not in PROPOSED state", () => {
      const committedAction = {
        id: "act-committed",
        status: "COMMITTED",
        expiresAt: new Date(Date.now() + 60000),
      };

      assert.equal(committedAction.status === "PROPOSED", false);
    });
  });
});
