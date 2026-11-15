import { z } from "zod";
import { PriorityEnum, IssueTypeEnum, WorkflowCategoryEnum } from "./common.contract.js";

export const DuplicateConfidenceEnum = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type DuplicateConfidence = z.infer<typeof DuplicateConfidenceEnum>;

export const DuplicateMatchSchema = z.object({
  issueId: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  priority: PriorityEnum,
  status: z.object({
    id: z.string().uuid().optional(),
    name: z.string(),
    category: WorkflowCategoryEnum,
    color: z.string().optional(),
  }),
  similarity: z.number().min(0).max(1),
  confidence: DuplicateConfidenceEnum,
});
export type DuplicateMatchDto = z.infer<typeof DuplicateMatchSchema>;

export const DuplicateDetectionRequestSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(3, "Title must be at least 3 characters").max(255),
  description: z.string().max(5000).optional(),
  excludeIssueId: z.string().uuid().optional(),
});
export type DuplicateDetectionRequestDto = z.infer<typeof DuplicateDetectionRequestSchema>;

export const DuplicateDetectionResponseSchema = z.object({
  hasDuplicates: z.boolean(),
  highestConfidence: z.enum(["NONE", "LOW", "MEDIUM", "HIGH"]),
  matches: z.array(DuplicateMatchSchema),
});
export type DuplicateDetectionResponseDto = z.infer<typeof DuplicateDetectionResponseSchema>;

export const SemanticSearchQuerySchema = z.object({
  query: z.string().min(2, "Search query must be at least 2 characters").max(500),
  projectId: z.string().uuid(),
  statusId: z.string().uuid().optional(),
  sprintId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  priority: PriorityEnum.optional(),
  type: IssueTypeEnum.optional(),
  includeCompleted: z.boolean().optional(),
  threshold: z.number().min(0.1).max(0.99).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});
export type SemanticSearchQueryDto = z.infer<typeof SemanticSearchQuerySchema>;

export const SemanticSearchResultItemSchema = z.object({
  issueId: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  priority: PriorityEnum,
  type: IssueTypeEnum,
  status: z.object({
    id: z.string().uuid().optional(),
    name: z.string(),
    category: WorkflowCategoryEnum,
    color: z.string().optional(),
  }),
  assignee: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
      email: z.string().email(),
      image: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  similarity: z.number().min(0).max(1),
});
export type SemanticSearchResultItemDto = z.infer<typeof SemanticSearchResultItemSchema>;

export const SemanticSearchResponseSchema = z.object({
  total: z.number().int(),
  results: z.array(SemanticSearchResultItemSchema),
});
export type SemanticSearchResponseDto = z.infer<typeof SemanticSearchResponseSchema>;
