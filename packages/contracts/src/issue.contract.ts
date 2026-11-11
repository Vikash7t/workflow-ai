import { z } from "zod";
import { IssueTypeEnum, PriorityEnum } from "./common.contract.js";

export const CreateIssueSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().max(50000).optional(),
  type: IssueTypeEnum.default("TASK"),
  priority: PriorityEnum.default("P2"),
  statusId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  estimate: z.number().int().min(0).max(100).optional(),
  dueDate: z.string().datetime().optional(),
});
export type CreateIssueDto = z.infer<typeof CreateIssueSchema>;

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
});
export type IssueDto = z.infer<typeof IssueDtoSchema>;
