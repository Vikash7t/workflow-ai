import { z } from "zod";
import { WorkflowCategoryEnum } from "./common.contract.js";

export const CreateWorkflowStatusSchema = z.object({
  name: z.string().min(1, "Status name is required").max(50),
  category: WorkflowCategoryEnum.default("UNSTARTED"),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be valid hex color (e.g. #3B82F6)").default("#6B7280"),
  position: z.number().int().min(0).optional(),
});
export type CreateWorkflowStatusDto = z.infer<typeof CreateWorkflowStatusSchema>;

export const UpdateWorkflowStatusSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  category: WorkflowCategoryEnum.optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.number().int().min(0).optional(),
  isDefault: z.boolean().optional(),
});
export type UpdateWorkflowStatusDto = z.infer<typeof UpdateWorkflowStatusSchema>;

export const WorkflowStatusDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  category: WorkflowCategoryEnum,
  color: z.string(),
  position: z.number().int(),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkflowStatusDto = z.infer<typeof WorkflowStatusDtoSchema>;
