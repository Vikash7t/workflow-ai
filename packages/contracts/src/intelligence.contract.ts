import { z } from "zod";
import { PriorityEnum } from "./common.contract.js";

export const RiskLevelEnum = z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]);
export type RiskLevel = z.infer<typeof RiskLevelEnum>;

export const StandupPeriodEnum = z.enum(["DAILY", "WEEKLY"]);
export type StandupPeriod = z.infer<typeof StandupPeriodEnum>;

export const DeliveryMetricsQuerySchema = z.object({
  windowDays: z.coerce.number().int().min(7).max(90).optional(),
});
export type DeliveryMetricsQueryDto = z.infer<typeof DeliveryMetricsQuerySchema>;

export const BottleneckItemSchema = z.object({
  issueId: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  priority: PriorityEnum,
  statusName: z.string(),
  dwellDays: z.number(),
  reason: z.string(),
});
export type BottleneckItemDto = z.infer<typeof BottleneckItemSchema>;

export const DeliveryMetricsResponseSchema = z.object({
  windowDays: z.number().int(),
  leadTimeDays: z.object({
    p50: z.number(),
    p85: z.number(),
    average: z.number(),
  }),
  cycleTimeDays: z.object({
    p50: z.number(),
    p85: z.number(),
    average: z.number(),
  }),
  throughput: z.object({
    completedIssuesCount: z.number().int(),
    weeklyThroughput: z.number(),
  }),
  bottlenecks: z.array(BottleneckItemSchema),
});
export type DeliveryMetricsResponseDto = z.infer<typeof DeliveryMetricsResponseSchema>;

export const SprintRiskFactorSchema = z.object({
  type: z.enum(["PACE_DEFICIT", "BLOCKER_CASCADE", "STALE_ISSUES", "ORPHANED_CRITICALS"]),
  severity: RiskLevelEnum,
  description: z.string(),
  affectedIssueKeys: z.array(z.string()),
});
export type SprintRiskFactorDto = z.infer<typeof SprintRiskFactorSchema>;

export const SprintRiskAnalysisResponseSchema = z.object({
  sprintId: z.string().uuid(),
  sprintName: z.string(),
  status: z.string(),
  riskLevel: RiskLevelEnum,
  pointsCompleted: z.number(),
  pointsTotal: z.number(),
  completionPercentage: z.number(),
  timeElapsedPercentage: z.number().nullable(),
  issuesCompletedCount: z.number().int(),
  issuesTotalCount: z.number().int(),
  riskFactors: z.array(SprintRiskFactorSchema),
});
export type SprintRiskAnalysisResponseDto = z.infer<typeof SprintRiskAnalysisResponseSchema>;

export const StandupReportRequestSchema = z.object({
  projectId: z.string().uuid(),
  sprintId: z.string().uuid().optional(),
  period: StandupPeriodEnum.optional(),
  synthesizeWithAi: z.boolean().optional(),
});
export type StandupReportRequestDto = z.infer<typeof StandupReportRequestSchema>;

export const StandupReportResponseSchema = z.object({
  generatedAt: z.string(),
  period: StandupPeriodEnum,
  executiveSummary: z.string(),
  completedItems: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      assigneeName: z.string().nullable(),
      completedAt: z.string(),
    })
  ),
  inProgressItems: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      assigneeName: z.string().nullable(),
      statusName: z.string(),
    })
  ),
  blockers: z.array(
    z.object({
      key: z.string(),
      title: z.string(),
      blockedByKeys: z.array(z.string()),
    })
  ),
  risks: z.array(
    z.object({
      severity: RiskLevelEnum,
      description: z.string(),
    })
  ),
});
export type StandupReportResponseDto = z.infer<typeof StandupReportResponseSchema>;
