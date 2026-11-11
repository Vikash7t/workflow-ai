import { z } from "zod";

export const RoleEnum = z.enum(["OWNER", "ADMIN", "MEMBER", "VIEWER"]);
export type Role = z.infer<typeof RoleEnum>;

export const IssueTypeEnum = z.enum(["EPIC", "STORY", "TASK", "BUG", "SUBTASK"]);
export type IssueType = z.infer<typeof IssueTypeEnum>;

export const PriorityEnum = z.enum(["P0", "P1", "P2", "P3"]);
export type Priority = z.infer<typeof PriorityEnum>;

export const WorkflowCategoryEnum = z.enum([
  "BACKLOG",
  "UNSTARTED",
  "STARTED",
  "COMPLETED",
  "CANCELLED",
]);
export type WorkflowCategory = z.infer<typeof WorkflowCategoryEnum>;

export const DependencyTypeEnum = z.enum(["BLOCKS", "RELATES_TO", "DUPLICATE_OF"]);
export type DependencyType = z.infer<typeof DependencyTypeEnum>;

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  timestamp: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
