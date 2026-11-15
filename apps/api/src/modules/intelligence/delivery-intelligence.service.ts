import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { env } from "../../config/env.config";
import {
  DeliveryMetricsQueryDto,
  DeliveryMetricsResponseDto,
  BottleneckItemDto,
  SprintRiskAnalysisResponseDto,
  SprintRiskFactorDto,
  StandupReportRequestDto,
  StandupReportResponseDto,
  RiskLevel,
  Priority,
} from "@workflow-ai/contracts";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Robust nearest-rank percentile calculation with boundary clamping.
 * Returns 0 for empty arrays; returns the element for single-element arrays.
 */
export function calculatePercentile(sortedValues: number[], p: number): number {
  if (!sortedValues || sortedValues.length === 0) return 0;
  if (sortedValues.length === 1) return sortedValues[0];

  const rank = (p / 100) * (sortedValues.length - 1);
  const lowerIndex = Math.floor(rank);
  const upperIndex = Math.ceil(rank);
  const weight = rank - lowerIndex;

  if (lowerIndex === upperIndex) {
    return sortedValues[lowerIndex];
  }

  return Math.round((sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight) * 10) / 10;
}

@Injectable()
export class DeliveryIntelligenceService {
  private readonly logger = new Logger(DeliveryIntelligenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministic lead time, cycle time, throughput, and bottleneck detection.
   */
  async getProjectDeliveryMetrics(
    workspaceId: string,
    projectId: string,
    query: DeliveryMetricsQueryDto
  ): Promise<DeliveryMetricsResponseDto> {
    // 1. Verify project belongs to workspace (IDOR Guard)
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException("Project not found in this workspace");
    }

    const windowDays = query.windowDays ?? 30;
    const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

    // 2. Query completed issues within the window
    const completedIssues = await this.prisma.issue.findMany({
      where: {
        workspaceId,
        projectId,
        status: { category: "COMPLETED" },
        updatedAt: { gte: since },
      },
      include: {
        status: true,
      },
      take: 100,
      orderBy: { updatedAt: "desc" },
    });

    const leadTimeDeltas: number[] = [];
    const cycleTimeDeltas: number[] = [];

    // Batch query activity logs to calculate exact transition to STARTED
    const completedIssueIds = completedIssues.map((i) => i.id);
    const startLogs = completedIssueIds.length > 0
      ? await this.prisma.activityLog.findMany({
          where: {
            issueId: { in: completedIssueIds },
            action: "STATUS_CHANGED",
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

    const startLogMap = new Map<string, Date>();
    for (const log of startLogs) {
      if (!startLogMap.has(log.issueId)) {
        startLogMap.set(log.issueId, log.createdAt);
      }
    }

    for (const issue of completedIssues) {
      const completedTime = issue.updatedAt.getTime();
      const createdTime = issue.createdAt.getTime();
      const leadTime = Math.max(0, (completedTime - createdTime) / (1000 * 60 * 60 * 24));
      leadTimeDeltas.push(leadTime);

      const startTime = startLogMap.get(issue.id)?.getTime() ?? createdTime;
      const cycleTime = Math.max(0, (completedTime - startTime) / (1000 * 60 * 60 * 24));
      cycleTimeDeltas.push(cycleTime);
    }

    leadTimeDeltas.sort((a, b) => a - b);
    cycleTimeDeltas.sort((a, b) => a - b);

    const leadAvg = leadTimeDeltas.length > 0
      ? Math.round((leadTimeDeltas.reduce((a, b) => a + b, 0) / leadTimeDeltas.length) * 10) / 10
      : 0;
    const cycleAvg = cycleTimeDeltas.length > 0
      ? Math.round((cycleTimeDeltas.reduce((a, b) => a + b, 0) / cycleTimeDeltas.length) * 10) / 10
      : 0;

    const leadTimeDays = {
      p50: calculatePercentile(leadTimeDeltas, 50),
      p85: calculatePercentile(leadTimeDeltas, 85),
      average: leadAvg,
    };

    const cycleTimeDays = {
      p50: calculatePercentile(cycleTimeDeltas, 50),
      p85: calculatePercentile(cycleTimeDeltas, 85),
      average: cycleAvg,
    };

    const completedCount = completedIssues.length;
    const weeklyThroughput = Math.round((completedCount / (windowDays / 7)) * 10) / 10;

    // 3. Bottleneck Analysis across active issues
    const activeIssues = await this.prisma.issue.findMany({
      where: {
        workspaceId,
        projectId,
        status: { category: { in: ["STARTED", "UNSTARTED"] } },
      },
      include: {
        status: true,
        blocking: { select: { blockedIssueId: true } },
      },
      take: 100,
    });

    const bottlenecks: BottleneckItemDto[] = [];
    const now = Date.now();

    for (const issue of activeIssues) {
      const dwellDays = Math.round(((now - issue.updatedAt.getTime()) / (1000 * 60 * 60 * 24)) * 10) / 10;

      // Rule 1: Stale in Review (>= 3 days)
      if (
        issue.status.category === "STARTED" &&
        issue.status.name.toLowerCase().includes("review") &&
        dwellDays >= 3
      ) {
        bottlenecks.push({
          issueId: issue.id,
          key: issue.key,
          title: issue.title,
          priority: issue.priority as Priority,
          statusName: issue.status.name,
          dwellDays,
          reason: `Awaiting code review for ${dwellDays} days`,
        });
        continue;
      }

      // Rule 2: Blocker Cascade (blocks >= 2 other issues)
      if (issue.blocking.length >= 2) {
        bottlenecks.push({
          issueId: issue.id,
          key: issue.key,
          title: issue.title,
          priority: issue.priority as Priority,
          statusName: issue.status.name,
          dwellDays,
          reason: `Blocking ${issue.blocking.length} other team issues`,
        });
        continue;
      }

      // Rule 3: Orphaned Critical (P0/P1 unassigned for >= 1 day)
      if (
        (issue.priority === "P0" || issue.priority === "P1") &&
        !issue.assigneeId &&
        dwellDays >= 1
      ) {
        bottlenecks.push({
          issueId: issue.id,
          key: issue.key,
          title: issue.title,
          priority: issue.priority as Priority,
          statusName: issue.status.name,
          dwellDays,
          reason: `Unassigned critical ticket open for ${dwellDays} days`,
        });
      }
    }

    bottlenecks.sort((a, b) => b.dwellDays - a.dwellDays);

    return {
      windowDays,
      leadTimeDays,
      cycleTimeDays,
      throughput: {
        completedIssuesCount: completedCount,
        weeklyThroughput,
      },
      bottlenecks: bottlenecks.slice(0, 10),
    };
  }

  /**
   * Evidence-backed sprint risk detection with null-safe timeline evaluation.
   */
  async getSprintRiskAnalysis(
    workspaceId: string,
    sprintId: string
  ): Promise<SprintRiskAnalysisResponseDto> {
    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        project: true,
        issues: {
          include: {
            status: true,
            blockedBy: {
              include: {
                blocker: { include: { status: true } },
              },
            },
          },
        },
      },
    });

    if (!sprint || sprint.workspaceId !== workspaceId) {
      throw new NotFoundException("Sprint not found in this workspace");
    }

    const issues = sprint.issues;
    const issuesTotal = issues.length;
    const completedIssues = issues.filter((i) => i.status.category === "COMPLETED");
    const issuesCompleted = completedIssues.length;

    const pointsTotal = issues.reduce((acc, i) => acc + (i.estimate || 0), 0);
    const pointsCompleted = completedIssues.reduce((acc, i) => acc + (i.estimate || 0), 0);

    const completionPercentage = pointsTotal > 0
      ? Math.round((pointsCompleted / pointsTotal) * 100)
      : issuesTotal > 0
      ? Math.round((issuesCompleted / issuesTotal) * 100)
      : 0;

    // Timeline evaluation (Null-safe)
    let timeElapsedPercentage: number | null = null;
    if (sprint.startDate && sprint.endDate) {
      const start = sprint.startDate.getTime();
      const end = sprint.endDate.getTime();
      const totalDuration = end - start;
      const now = Date.now();

      if (totalDuration <= 0) {
        timeElapsedPercentage = 100;
      } else {
        const elapsed = now - start;
        timeElapsedPercentage = Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100)));
      }
    }

    // Risk factors analysis
    const riskFactors: SprintRiskFactorDto[] = [];

    // Factor 1: Pace Deficit
    if (timeElapsedPercentage !== null && sprint.status === "ACTIVE") {
      const deficit = timeElapsedPercentage - completionPercentage;
      if (deficit >= 35) {
        riskFactors.push({
          type: "PACE_DEFICIT",
          severity: deficit >= 50 ? "CRITICAL" : "HIGH",
          description: `Timeline is ${timeElapsedPercentage}% elapsed but only ${completionPercentage}% of work is completed.`,
          affectedIssueKeys: issues.filter((i) => i.status.category !== "COMPLETED").map((i) => i.key).slice(0, 5),
        });
      } else if (deficit >= 20) {
        riskFactors.push({
          type: "PACE_DEFICIT",
          severity: "MEDIUM",
          description: `Sprint completion velocity is lagging timeline elapsed by ${deficit}%.`,
          affectedIssueKeys: [],
        });
      }
    }

    // Factor 2: Blocker Cascade in Active Sprint
    const blockedIssues = issues.filter(
      (i) =>
        i.status.category !== "COMPLETED" &&
        i.blockedBy.some((b) => b.blocker.status.category !== "COMPLETED")
    );
    if (blockedIssues.length > 0) {
      riskFactors.push({
        type: "BLOCKER_CASCADE",
        severity: blockedIssues.length >= 3 ? "HIGH" : "MEDIUM",
        description: `${blockedIssues.length} issue(s) are actively blocked by unfinished dependencies.`,
        affectedIssueKeys: blockedIssues.map((i) => i.key),
      });
    }

    // Factor 3: Stale Issues
    const staleIssues = issues.filter(
      (i) =>
        i.status.category === "STARTED" &&
        i.updatedAt &&
        (Date.now() - new Date(i.updatedAt).getTime()) / (1000 * 60 * 60 * 24) >= 4
    );
    if (staleIssues.length > 0) {
      riskFactors.push({
        type: "STALE_ISSUES",
        severity: staleIssues.length >= 3 ? "HIGH" : "MEDIUM",
        description: `${staleIssues.length} in-progress ticket(s) have had no activity for 4+ days.`,
        affectedIssueKeys: staleIssues.map((i) => i.key),
      });
    }

    // Factor 4: Orphaned Criticals
    const orphanedP0 = issues.filter(
      (i) => (i.priority === "P0" || i.priority === "P1") && !i.assigneeId && i.status.category !== "COMPLETED"
    );
    if (orphanedP0.length > 0) {
      riskFactors.push({
        type: "ORPHANED_CRITICALS",
        severity: "CRITICAL",
        description: `${orphanedP0.length} critical ticket(s) in this sprint have no assigned owner.`,
        affectedIssueKeys: orphanedP0.map((i) => i.key),
      });
    }

    // Overall Risk Level
    let riskLevel: RiskLevel = "LOW";
    if (riskFactors.some((r) => r.severity === "CRITICAL")) {
      riskLevel = "CRITICAL";
    } else if (riskFactors.some((r) => r.severity === "HIGH")) {
      riskLevel = "HIGH";
    } else if (riskFactors.some((r) => r.severity === "MEDIUM")) {
      riskLevel = "MEDIUM";
    }

    return {
      sprintId: sprint.id,
      sprintName: sprint.name,
      status: sprint.status,
      riskLevel,
      pointsCompleted,
      pointsTotal,
      completionPercentage,
      timeElapsedPercentage,
      issuesCompletedCount: issuesCompleted,
      issuesTotalCount: issuesTotal,
      riskFactors,
    };
  }

  /**
   * Deterministic Standup Report Generator with optional AI executive synthesis.
   */
  async generateStandupReport(
    workspaceId: string,
    dto: StandupReportRequestDto
  ): Promise<StandupReportResponseDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException("Project not found in this workspace");
    }

    if (dto.sprintId) {
      const sprint = await this.prisma.sprint.findUnique({
        where: { id: dto.sprintId },
      });
      if (!sprint || sprint.workspaceId !== workspaceId || sprint.projectId !== dto.projectId) {
        throw new BadRequestException("Sprint not found in this project");
      }
    }

    const period = dto.period ?? "DAILY";
    const windowMs = period === "DAILY" ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - windowMs);

    const issueFilter: any = {
      workspaceId,
      projectId: dto.projectId,
      ...(dto.sprintId ? { sprintId: dto.sprintId } : {}),
    };

    // 1. Completed Items
    const completedRecords = await this.prisma.issue.findMany({
      where: {
        ...issueFilter,
        status: { category: "COMPLETED" },
        updatedAt: { gte: since },
      },
      include: { assignee: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const completedItems = completedRecords.map((i) => ({
      key: i.key,
      title: i.title,
      assigneeName: i.assignee?.name || null,
      completedAt: i.updatedAt.toISOString(),
    }));

    // 2. In-Progress Items
    const inProgressRecords = await this.prisma.issue.findMany({
      where: {
        ...issueFilter,
        status: { category: "STARTED" },
      },
      include: { assignee: true, status: true },
      orderBy: { updatedAt: "desc" },
      take: 20,
    });

    const inProgressItems = inProgressRecords.map((i) => ({
      key: i.key,
      title: i.title,
      assigneeName: i.assignee?.name || null,
      statusName: i.status.name,
    }));

    // 3. Blockers
    const blockedRecords = await this.prisma.issue.findMany({
      where: {
        ...issueFilter,
        status: { category: { not: "COMPLETED" } },
        blockedBy: { some: {} },
      },
      include: {
        blockedBy: {
          include: { blocker: true },
        },
      },
      take: 10,
    });

    const blockers = blockedRecords.map((i) => ({
      key: i.key,
      title: i.title,
      blockedByKeys: i.blockedBy.map((b) => b.blocker.key),
    }));

    // 4. Risks
    const risks: Array<{ severity: RiskLevel; description: string }> = [];
    if (blockers.length >= 3) {
      risks.push({
        severity: "HIGH",
        description: `Multiple dependency bottlenecks detected (${blockers.length} issues blocked).`,
      });
    }

    const unassignedCriticals = inProgressRecords.filter(
      (i) => !i.assigneeId
    );
    if (unassignedCriticals.length > 0) {
      risks.push({
        severity: "MEDIUM",
        description: `${unassignedCriticals.length} in-progress task(s) currently have no assigned engineer.`,
      });
    }

    // 5. Executive Summary (Deterministic with optional Gemini AI synthesis)
    let executiveSummary = "";

    if (dto.synthesizeWithAi && env.GEMINI_API_KEY && process.env.NODE_ENV !== "test") {
      try {
        const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
        const prompt = `You are a technical delivery manager generating a concise executive standup summary.
Summarize the following verified team activities strictly grounded in the provided records. Do not invent any tickets or metrics.
<standup_context>
Project: ${project.name} (${project.key})
Period: ${period}
Completed (${completedItems.length}): ${completedItems.map((c) => `${c.key} (${c.title})`).join(", ") || "None"}
In Progress (${inProgressItems.length}): ${inProgressItems.map((c) => `${c.key} (${c.title}) - ${c.statusName}`).join(", ") || "None"}
Blockers (${blockers.length}): ${blockers.map((b) => `${b.key} blocked by ${b.blockedByKeys.join(", ")}`).join("; ") || "None"}
</standup_context>

Write a crisp 2-3 sentence executive paragraph highlighting progress, key blockers, and immediate focus areas.`;

        const { text } = await generateText({
          model: google("gemini-1.5-flash"),
          prompt,
        });

        if (text && text.trim().length > 10) {
          executiveSummary = text.trim();
        }
      } catch (err: any) {
        this.logger.warn(`AI standup synthesis failed (${err.message}). Using deterministic summary.`);
      }
    }

    if (!executiveSummary) {
      const completedText = completedItems.length > 0
        ? `completed ${completedItems.length} issue(s) (${completedItems.map((i) => i.key).join(", ")})`
        : "recorded no newly completed tickets";
      const inProgressText = inProgressItems.length > 0
        ? `${inProgressItems.length} issue(s) are currently in flight`
        : "no tasks currently in development";
      const blockerText = blockers.length > 0
        ? `with ${blockers.length} ticket(s) blocked`
        : "with zero active blockers";

      executiveSummary = `During the last ${period.toLowerCase()} cycle, the team ${completedText}. Currently, ${inProgressText} ${blockerText}.`;
    }

    return {
      generatedAt: new Date().toISOString(),
      period,
      executiveSummary,
      completedItems,
      inProgressItems,
      blockers,
      risks,
    };
  }
}
