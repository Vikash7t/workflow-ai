import { z } from "zod";
import { RoleEnum } from "./common.contract.js";

// -----------------------------------------------------------------------------
// Organization Contracts
// -----------------------------------------------------------------------------

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens")
    .optional(),
});
export type CreateOrganizationDto = z.infer<typeof CreateOrganizationSchema>;

export const UpdateOrganizationSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});
export type UpdateOrganizationDto = z.infer<typeof UpdateOrganizationSchema>;

export const OrganizationDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  role: RoleEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OrganizationDto = z.infer<typeof OrganizationDtoSchema>;

// -----------------------------------------------------------------------------
// Workspace Contracts
// -----------------------------------------------------------------------------

export const CreateWorkspaceSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(2, "Workspace name must be at least 2 characters").max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens")
    .optional(),
});
export type CreateWorkspaceDto = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(2).max(100).optional(),
});
export type UpdateWorkspaceDto = z.infer<typeof UpdateWorkspaceSchema>;

export const WorkspaceDtoSchema = z.object({
  id: z.string().uuid(),
  organizationId: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  role: RoleEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkspaceDto = z.infer<typeof WorkspaceDtoSchema>;

// -----------------------------------------------------------------------------
// Membership & Invitation Contracts
// -----------------------------------------------------------------------------

export const WorkspaceMemberDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  userId: z.string().uuid(),
  role: RoleEnum,
  createdAt: z.string(),
  user: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string().email(),
    image: z.string().nullable().optional(),
  }),
});
export type WorkspaceMemberDto = z.infer<typeof WorkspaceMemberDtoSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email("Valid email required"),
  role: RoleEnum.default("MEMBER"),
});
export type InviteMemberDto = z.infer<typeof InviteMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
  role: RoleEnum,
});
export type UpdateMemberRoleDto = z.infer<typeof UpdateMemberRoleSchema>;

export const AcceptInvitationSchema = z.object({
  token: z.string().min(1, "Invitation token is required"),
});
export type AcceptInvitationDto = z.infer<typeof AcceptInvitationSchema>;

export const WorkspaceInvitationDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  email: z.string().email(),
  role: RoleEnum,
  token: z.string(),
  expiresAt: z.string(),
  createdAt: z.string(),
  inviter: z.object({
    name: z.string().nullable(),
    email: z.string().email(),
  }),
});
export type WorkspaceInvitationDto = z.infer<typeof WorkspaceInvitationDtoSchema>;
