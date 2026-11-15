import { z } from "zod";
import { IssueTypeEnum, PriorityEnum } from "./common.contract.js";

// =============================================================================
// AI Task Decomposition Schemas
// =============================================================================

export const DecomposeTaskItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  type: IssueTypeEnum.default("TASK"),
  priority: PriorityEnum.default("P2"),
  estimate: z.number().int().min(1).max(100).optional().nullable(),
  description: z.string().optional().nullable(),
  acceptanceCriteria: z.array(z.string().min(1)).default([]),
});

export type DecomposeTaskItemDto = z.infer<typeof DecomposeTaskItemSchema>;

export const DecomposeTaskPlanSchema = z.object({
  epicTitle: z.string().min(1, "Epic title is required").max(255),
  epicDescription: z.string().optional().nullable(),
  items: z.array(DecomposeTaskItemSchema).min(1, "Plan must contain at least 1 item").max(30),
});

export type DecomposeTaskPlanDto = z.infer<typeof DecomposeTaskPlanSchema>;

export const DecomposeTaskRequestSchema = z.object({
  projectId: z.string().uuid("Valid projectId is required"),
  rawText: z
    .string()
    .min(10, "Input text must be at least 10 characters")
    .max(10000, "Input text cannot exceed 10,000 characters"),
  sprintId: z.string().uuid().optional().nullable(),
});

export type DecomposeTaskRequestDto = z.infer<typeof DecomposeTaskRequestSchema>;

// =============================================================================
// AI Session Actions & Two-Phase Commit
// =============================================================================

export const AiActionStatusEnum = z.enum(["PROPOSED", "COMMITTED", "REJECTED", "EXPIRED"]);
export type AiActionStatus = z.infer<typeof AiActionStatusEnum>;

export const AiActionTypeEnum = z.enum(["DECOMPOSE_TASKS"]);
export type AiActionType = z.infer<typeof AiActionTypeEnum>;

export const AiActionDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  actionType: AiActionTypeEnum,
  rawInput: z.string(),
  plan: DecomposeTaskPlanSchema,
  status: AiActionStatusEnum,
  expiresAt: z.string().datetime(),
  committedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type AiActionDto = z.infer<typeof AiActionDtoSchema>;

export const CommitAiActionSchema = z.object({
  items: z.array(DecomposeTaskItemSchema).min(1, "Must commit at least 1 item").max(30),
  sprintId: z.string().uuid().optional().nullable(),
});

export type CommitAiActionDto = z.infer<typeof CommitAiActionSchema>;

// =============================================================================
// AI Request Audit Log
// =============================================================================

export const AiRequestAuditDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  provider: z.string(),
  model: z.string(),
  promptTokens: z.number().int(),
  completionTokens: z.number().int(),
  totalTokens: z.number().int(),
  estimatedCostUSD: z.number(),
  latencyMs: z.number().int(),
  status: z.enum(["SUCCESS", "FAILED"]),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
});

export type AiRequestAuditDto = z.infer<typeof AiRequestAuditDtoSchema>;
