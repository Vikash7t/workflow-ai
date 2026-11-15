import test from "node:test";
import assert from "node:assert/strict";
import {
  DeliveryMetricsQuerySchema,
  StandupReportRequestSchema,
} from "@workflow-ai/contracts";
import {
  DeliveryIntelligenceService,
  calculatePercentile,
} from "./delivery-intelligence.service";

test("Delivery Intelligence & Standup Reports Domain Audit (Phase 10)", async (t) => {
  await t.test("Mathematical & Percentile Boundary Invariants", async (t2) => {
    await t2.test("returns 0 for empty arrays", () => {
      assert.equal(calculatePercentile([], 50), 0);
      assert.equal(calculatePercentile([], 85), 0);
    });

    await t2.test("returns single element value on length 1 arrays without crash", () => {
      assert.equal(calculatePercentile([7.5], 50), 7.5);
      assert.equal(calculatePercentile([7.5], 85), 7.5);
    });

    await t2.test("computes accurate nearest-rank percentiles on sorted dataset", () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const p50 = calculatePercentile(data, 50);
      const p85 = calculatePercentile(data, 85);

      assert.ok(p50 >= 5 && p50 <= 6, `Expected p50 around 5.5, got ${p50}`);
      assert.ok(p85 >= 8 && p85 <= 9, `Expected p85 around 8.6, got ${p85}`);
    });
  });

  await t.test("Zod Contract & Schema Validation", async (t2) => {
    await t2.test("rejects windowDays under 7 or over 90", () => {
      assert.equal(DeliveryMetricsQuerySchema.safeParse({ windowDays: 3 }).success, false);
      assert.equal(DeliveryMetricsQuerySchema.safeParse({ windowDays: 120 }).success, false);
    });

    await t2.test("accepts valid metrics query and sets default window", () => {
      const parsed = DeliveryMetricsQuerySchema.safeParse({});
      assert.equal(parsed.success, true);
    });

    await t2.test("rejects standup request with invalid project UUID", () => {
      const parsed = StandupReportRequestSchema.safeParse({ projectId: "invalid-uuid" });
      assert.equal(parsed.success, false);
    });
  });

  await t.test("Multi-Tenant Scoping & Security Rules (OWASP API1:2023 / BOLA)", async (t2) => {
    const mockDb = {
      project: {
        findUnique: async ({ where }: any) => {
          if (where.id === "proj-alpha") {
            return { id: "proj-alpha", workspaceId: "ws-authorized", name: "Alpha", key: "ALP" };
          }
          if (where.id === "proj-foreign") {
            return { id: "proj-foreign", workspaceId: "ws-other-tenant", name: "Foreign", key: "FOR" };
          }
          return null;
        },
      },
      sprint: {
        findUnique: async ({ where }: any) => {
          if (where.id === "sprint-alpha") {
            return {
              id: "sprint-alpha",
              workspaceId: "ws-authorized",
              projectId: "proj-alpha",
              name: "Sprint 1",
              status: "ACTIVE",
              startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              issues: [],
            };
          }
          if (where.id === "sprint-foreign") {
            return {
              id: "sprint-foreign",
              workspaceId: "ws-other-tenant",
              projectId: "proj-foreign",
              name: "Foreign Sprint",
            };
          }
          return null;
        },
      },
    };

    const service = new DeliveryIntelligenceService(mockDb as any);

    await t2.test("rejects project metrics when projectId does not belong to authorized workspace (IDOR)", async () => {
      await assert.rejects(
        async () => {
          await service.getProjectDeliveryMetrics("ws-authorized", "proj-foreign", {});
        },
        { name: "NotFoundException", message: "Project not found in this workspace" }
      );
    });

    await t2.test("rejects sprint risk analysis when sprintId belongs to other tenant (IDOR)", async () => {
      await assert.rejects(
        async () => {
          await service.getSprintRiskAnalysis("ws-authorized", "sprint-foreign");
        },
        { name: "NotFoundException", message: "Sprint not found in this workspace" }
      );
    });

    await t2.test("rejects standup generation when sprintId belongs to another project", async () => {
      await assert.rejects(
        async () => {
          await service.generateStandupReport("ws-authorized", {
            projectId: "proj-alpha",
            sprintId: "sprint-foreign",
          });
        },
        { name: "BadRequestException", message: "Sprint not found in this project" }
      );
    });
  });

  await t.test("Deterministic Delivery Metrics & Bottleneck Detection", async (t2) => {
    const now = Date.now();
    const fourDaysAgo = new Date(now - 4 * 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now - 2 * 24 * 60 * 60 * 1000);

    const mockDb = {
      project: {
        findUnique: async () => ({ id: "proj-alpha", workspaceId: "ws-authorized" }),
      },
      issue: {
        findMany: async ({ where }: any) => {
          if (where.status?.category === "COMPLETED") {
            return [
              {
                id: "i-1",
                key: "ENG-101",
                title: "Login Flow",
                createdAt: fourDaysAgo,
                updatedAt: twoDaysAgo,
                status: { category: "COMPLETED", name: "Done" },
              },
              {
                id: "i-2",
                key: "ENG-102",
                title: "Database Indexing",
                createdAt: fourDaysAgo,
                updatedAt: new Date(now - 1 * 24 * 60 * 60 * 1000),
                status: { category: "COMPLETED", name: "Done" },
              },
            ];
          }
          // Active issues for bottlenecks
          return [
            {
              id: "i-3",
              key: "ENG-103",
              title: "Stuck in Review PR",
              priority: "P1",
              assigneeId: "u-1",
              updatedAt: fourDaysAgo,
              status: { category: "STARTED", name: "In Review" },
              blocking: [],
            },
            {
              id: "i-4",
              key: "ENG-104",
              title: "Blocker Ticket Multiplier",
              priority: "P1",
              assigneeId: "u-2",
              updatedAt: twoDaysAgo,
              status: { category: "STARTED", name: "In Progress" },
              blocking: [{ blockedIssueId: "i-5" }, { blockedIssueId: "i-6" }],
            },
            {
              id: "i-5",
              key: "ENG-105",
              title: "Critical Bug Unassigned",
              priority: "P0",
              assigneeId: null,
              updatedAt: fourDaysAgo,
              status: { category: "UNSTARTED", name: "Todo" },
              blocking: [],
            },
          ];
        },
      },
      activityLog: {
        findMany: async () => [],
      },
    };

    const service = new DeliveryIntelligenceService(mockDb as any);
    const metrics = await service.getProjectDeliveryMetrics("ws-authorized", "proj-alpha", { windowDays: 30 });

    assert.equal(metrics.throughput.completedIssuesCount, 2);
    assert.ok(metrics.leadTimeDays.average > 0);
    assert.equal(metrics.bottlenecks.length, 3);

    const staleReview = metrics.bottlenecks.find((b) => b.key === "ENG-103");
    assert.ok(staleReview);
    assert.ok(staleReview.reason.includes("Awaiting code review"));

    const blockerCascade = metrics.bottlenecks.find((b) => b.key === "ENG-104");
    assert.ok(blockerCascade);
    assert.ok(blockerCascade.reason.includes("Blocking 2 other team issues"));

    const orphanedCritical = metrics.bottlenecks.find((b) => b.key === "ENG-105");
    assert.ok(orphanedCritical);
    assert.ok(orphanedCritical.reason.includes("Unassigned critical ticket"));
  });

  await t.test("Sprint Risk Analysis with Null Dates & Division-by-Zero Protection", async (t2) => {
    const mockDbNullDates = {
      sprint: {
        findUnique: async () => ({
          id: "sprint-null",
          workspaceId: "ws-authorized",
          name: "Sprint With Null Dates",
          status: "PLANNED",
          startDate: null,
          endDate: null,
          issues: [
            {
              id: "i-1",
              key: "ENG-201",
              estimate: 5,
              updatedAt: new Date(),
              status: { category: "COMPLETED" },
              blockedBy: [],
            },
            {
              id: "i-2",
              key: "ENG-202",
              estimate: 5,
              updatedAt: new Date(),
              status: { category: "STARTED" },
              blockedBy: [],
            },
          ],
        }),
      },
    };

    const service = new DeliveryIntelligenceService(mockDbNullDates as any);
    const risk = await service.getSprintRiskAnalysis("ws-authorized", "sprint-null");

    assert.equal(risk.timeElapsedPercentage, null);
    assert.equal(risk.pointsCompleted, 5);
    assert.equal(risk.pointsTotal, 10);
    assert.equal(risk.completionPercentage, 50);
    assert.equal(risk.riskLevel, "LOW");
  });

  await t.test("Deterministic Standup Report Aggregation", async (t2) => {
    const mockDbStandup = {
      project: {
        findUnique: async () => ({
          id: "proj-alpha",
          workspaceId: "ws-authorized",
          name: "Alpha Platform",
          key: "ALP",
        }),
      },
      issue: {
        findMany: async ({ where }: any) => {
          if (where.status?.category === "COMPLETED") {
            return [
              {
                key: "ALP-10",
                title: "Fix SSO Token Leak",
                updatedAt: new Date(),
                assignee: { name: "Maria Garcia" },
              },
            ];
          }
          if (where.status?.category === "STARTED") {
            return [
              {
                key: "ALP-11",
                title: "Migrate Postgres Schema",
                assignee: { name: "Alex Chen" },
                status: { name: "In Progress" },
              },
            ];
          }
          if (where.blockedBy?.some) {
            return [
              {
                key: "ALP-12",
                title: "Frontend Integration",
                blockedBy: [{ blocker: { key: "ALP-11" } }],
              },
            ];
          }
          return [];
        },
      },
    };

    const service = new DeliveryIntelligenceService(mockDbStandup as any);
    const report = await service.generateStandupReport("ws-authorized", {
      projectId: "proj-alpha",
      period: "DAILY",
      synthesizeWithAi: false,
    });

    assert.equal(report.period, "DAILY");
    assert.equal(report.completedItems.length, 1);
    assert.equal(report.completedItems[0].key, "ALP-10");
    assert.equal(report.inProgressItems.length, 1);
    assert.equal(report.inProgressItems[0].key, "ALP-11");
    assert.equal(report.blockers.length, 1);
    assert.equal(report.blockers[0].key, "ALP-12");
    assert.ok(report.executiveSummary.includes("completed 1 issue(s)"));
  });
});
