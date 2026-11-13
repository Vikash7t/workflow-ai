import { z } from "zod";

export const CreateProjectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters").max(100),
  key: z
    .string()
    .min(2, "Project key must be at least 2 characters")
    .max(10, "Project key must be at most 10 characters")
    .regex(/^[A-Z0-9]+$/, "Project key must contain only uppercase letters and numbers (e.g. ENG, PLAT)"),
  description: z.string().max(2000).optional(),
});
export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(2000).optional().nullable(),
});
export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;

export const ProjectDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  issueCounter: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ProjectDto = z.infer<typeof ProjectDtoSchema>;
