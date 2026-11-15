import { z } from "zod";
import { PriorityEnum } from "./common.contract.js";

export const PlatformEnum = z.enum(["SLACK", "DISCORD"]);
export type Platform = z.infer<typeof PlatformEnum>;

export const CreateChannelMappingSchema = z.object({
  projectId: z.string().uuid(),
  platform: PlatformEnum,
  channelId: z.string().min(2, "Channel ID is required").max(100),
  channelName: z.string().max(100).optional(),
  defaultStatusId: z.string().uuid().optional(),
  defaultPriority: PriorityEnum.optional(),
});
export type CreateChannelMappingDto = z.infer<typeof CreateChannelMappingSchema>;

export const ChannelMappingDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  projectId: z.string().uuid(),
  platform: PlatformEnum,
  channelId: z.string(),
  channelName: z.string().nullable(),
  defaultStatusId: z.string().uuid().nullable(),
  defaultPriority: PriorityEnum,
  createdAt: z.string(),
  updatedAt: z.string(),
  project: z
    .object({
      id: z.string().uuid(),
      name: z.string(),
      key: z.string(),
    })
    .optional(),
});
export type ChannelMappingDto = z.infer<typeof ChannelMappingDtoSchema>;

export const ExternalIssueCreatedResponseSchema = z.object({
  success: z.boolean(),
  issueKey: z.string(),
  issueId: z.string().uuid(),
  title: z.string(),
  projectKey: z.string(),
  message: z.string(),
});
export type ExternalIssueCreatedResponseDto = z.infer<
  typeof ExternalIssueCreatedResponseSchema
>;
