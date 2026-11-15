import { z } from "zod";

// =============================================================================
// Git Integrations (GitHub & GitLab)
// =============================================================================

export const GitProviderEnum = z.enum(["GITHUB", "GITLAB"]);
export type GitProvider = z.infer<typeof GitProviderEnum>;

export const WebhookEventStatusEnum = z.enum([
  "RECEIVED",
  "PROCESSED",
  "DUPLICATE",
  "FAILED",
  "IGNORED",
]);
export type WebhookEventStatus = z.infer<typeof WebhookEventStatusEnum>;

export const CreateGitIntegrationSchema = z.object({
  projectId: z.string().uuid("Valid projectId is required"),
  provider: GitProviderEnum,
  repository: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[\w.-]+\/[\w.-]+$/, "Repository must be in 'owner/repo' format"),
});

export type CreateGitIntegrationDto = z.infer<typeof CreateGitIntegrationSchema>;

export const UpdateGitIntegrationSchema = z.object({
  enabled: z.boolean().optional(),
});

export type UpdateGitIntegrationDto = z.infer<typeof UpdateGitIntegrationSchema>;

export const GitIntegrationDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  provider: GitProviderEnum,
  repository: z.string(),
  maskedSecret: z.string(),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type GitIntegrationDto = z.infer<typeof GitIntegrationDtoSchema>;

export const CreatedGitIntegrationDtoSchema = GitIntegrationDtoSchema.extend({
  plaintextSecret: z.string(),
  webhookUrl: z.string(),
});

export type CreatedGitIntegrationDto = z.infer<typeof CreatedGitIntegrationDtoSchema>;

export const WebhookDeliveryResultSchema = z.object({
  deliveryId: z.string(),
  status: WebhookEventStatusEnum,
  extractedKeys: z.array(z.string()),
  transitionedIssues: z.array(z.string()),
});

export type WebhookDeliveryResultDto = z.infer<typeof WebhookDeliveryResultSchema>;
