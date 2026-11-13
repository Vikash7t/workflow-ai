import { z } from "zod";
import { IssueTypeEnum, PriorityEnum } from "./common.contract.js";
import { WorkflowStatusDtoSchema } from "./workflow.contract.js";

export const CreateIssueSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(50000).optional(),
  type: IssueTypeEnum.default("TASK"),
  priority: PriorityEnum.default("P2"),
  statusId: z.string().uuid(),
  parentId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  estimate: z.number().int().min(0).max(100).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});
export type CreateIssueDto = z.infer<typeof CreateIssueSchema>;

export const UpdateIssueSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().max(50000).optional().nullable(),
  type: IssueTypeEnum.optional(),
  priority: PriorityEnum.optional(),
  statusId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  estimate: z.number().int().min(0).max(100).optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});
export type UpdateIssueDto = z.infer<typeof UpdateIssueSchema>;

export const IssueFilterSchema = z.object({
  projectId: z.string().uuid().optional(),
  statusId: z.string().uuid().optional(),
  type: IssueTypeEnum.optional(),
  priority: PriorityEnum.optional(),
  assigneeId: z.string().uuid().optional(),
  reporterId: z.string().uuid().optional(),
  parentId: z.string().uuid().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});
export type IssueFilterDto = z.infer<typeof IssueFilterSchema>;

export const BulkUpdateStatusSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1, "At least one issue ID is required").max(100),
  statusId: z.string().uuid(),
});
export type BulkUpdateStatusDto = z.infer<typeof BulkUpdateStatusSchema>;

export const BulkUpdateAssigneeSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1, "At least one issue ID is required").max(100),
  assigneeId: z.string().uuid().nullable(),
});
export type BulkUpdateAssigneeDto = z.infer<typeof BulkUpdateAssigneeSchema>;

export const BulkDeleteIssuesSchema = z.object({
  issueIds: z.array(z.string().uuid()).min(1, "At least one issue ID is required").max(100),
});
export type BulkDeleteIssuesDto = z.infer<typeof BulkDeleteIssuesSchema>;

export const IssueDtoSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  issueNumber: z.number().int(),
  key: z.string(),
  type: IssueTypeEnum,
  title: z.string(),
  description: z.string().nullable(),
  priority: PriorityEnum,
  statusId: z.string().uuid(),
  parentId: z.string().uuid().nullable(),
  assigneeId: z.string().uuid().nullable(),
  reporterId: z.string().uuid(),
  estimate: z.number().nullable(),
  dueDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: WorkflowStatusDtoSchema.optional(),
  assignee: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
      email: z.string().email(),
      image: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  reporter: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
      email: z.string().email(),
      image: z.string().nullable().optional(),
    })
    .optional(),
  subtaskCount: z.number().int().optional(),
});
export type IssueDto = z.infer<typeof IssueDtoSchema>;
