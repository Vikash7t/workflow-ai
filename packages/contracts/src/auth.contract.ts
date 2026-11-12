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

export const UpdateUserProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().optional().nullable(),
});
export type UpdateUserProfileDto = z.infer<typeof UpdateUserProfileSchema>;

export const SendMagicLinkSchema = z.object({
  email: z.string().email(),
});
export type SendMagicLinkDto = z.infer<typeof SendMagicLinkSchema>;

export const SignUpEmailPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
});
export type SignUpEmailPasswordDto = z.infer<typeof SignUpEmailPasswordSchema>;

export const SignInEmailPasswordSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
export type SignInEmailPasswordDto = z.infer<typeof SignInEmailPasswordSchema>;

export const WorkspaceContextSchema = z.object({
  workspaceId: z.string().uuid(),
  workspaceName: z.string(),
  workspaceSlug: z.string(),
  organizationId: z.string().uuid(),
  role: RoleEnum,
});
export type WorkspaceContextDto = z.infer<typeof WorkspaceContextSchema>;
