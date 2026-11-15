import { z } from "zod";

export const SprintStatusEnum = z.enum(["PLANNED", "ACTIVE", "COMPLETED"]);
export type SprintStatus = z.infer<typeof SprintStatusEnum>;

export const CreateSprintSchema = z.object({
  projectId: z.string().uuid("Project ID must be a valid UUID"),
  name: z.string().min(1, "Sprint name is required").max(100),
  goal: z.string().max(1000).optional().nullable(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});
export type CreateSprintDto = z.infer<typeof CreateSprintSchema>;

export const UpdateSprintSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  goal: z.string().max(1000).optional().nullable(),
  status: SprintStatusEnum.optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
});
export type UpdateSprintDto = z.infer<typeof UpdateSprintSchema>;

export const CompleteSprintSchema = z.object({
  targetSprintId: z.string().uuid().optional().nullable(), // Optional rollover sprint, null rolls to backlog
});
export type CompleteSprintDto = z.infer<typeof CompleteSprintSchema>;

export const SprintDtoSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  goal: z.string().nullable(),
  status: SprintStatusEnum,
  startDate: z.string().nullable(),
  endDate: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  issueCount: z.number().int().optional(),
  totalPoints: z.number().int().optional(),
  completedPoints: z.number().int().optional(),
});
export type SprintDto = z.infer<typeof SprintDtoSchema>;
