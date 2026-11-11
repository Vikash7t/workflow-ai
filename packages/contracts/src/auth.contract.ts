import { z } from "zod";
import { RoleEnum } from "./common.contract.js";

export const UserProfileSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  image: z.string().url().nullable().optional(),
  createdAt: z.string(),
});
export type UserProfileDto = z.infer<typeof UserProfileSchema>;

export const WorkspaceContextSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceName: z.string(),
  workspaceSlug: z.string(),
  organizationId: z.string().uuid(),
  role: RoleEnum,
});
export type WorkspaceContextDto = z.infer<typeof WorkspaceContextSchema>;
