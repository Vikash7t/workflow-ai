import { z } from "zod";

export const ActivityActionEnum = z.enum([
  "CREATED",
  "STATUS_CHANGED",
  "ASSIGNED",
  "PRIORITY_CHANGED",
  "SPRINT_CHANGED",
  "COMMENTED",
  "DEPENDENCY_ADDED",
  "DEPENDENCY_REMOVED",
]);
export type ActivityAction = z.infer<typeof ActivityActionEnum>;

export const ActivityLogDtoSchema = z.object({
  id: z.string().uuid(),
  issueId: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  action: ActivityActionEnum,
  metadata: z.record(z.string(), z.any()).nullable().optional(),
  createdAt: z.string(),
  user: z
    .object({
      id: z.string().uuid(),
      name: z.string().nullable(),
      email: z.string().email(),
      image: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
});
export type ActivityLogDto = z.infer<typeof ActivityLogDtoSchema>;
