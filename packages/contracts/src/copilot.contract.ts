import { z } from "zod";

// =============================================================================
// Conversational Project Copilot
// =============================================================================

export const ChatMessageRoleEnum = z.enum(["user", "assistant"]);
export type ChatMessageRole = z.infer<typeof ChatMessageRoleEnum>;

export const ChatMessageSchema = z.object({
  role: ChatMessageRoleEnum,
  content: z.string().min(1).max(2000),
});

export type ChatMessageDto = z.infer<typeof ChatMessageSchema>;

export const CopilotActionTypeEnum = z.enum([
  "MOVE_ISSUE",
  "UPDATE_PRIORITY",
  "ASSIGN_ISSUE",
  "CREATE_ISSUE",
]);
export type CopilotActionType = z.infer<typeof CopilotActionTypeEnum>;

export const CopilotProposedActionSchema = z.object({
  actionType: CopilotActionTypeEnum,
  targetIssueKey: z.string().min(1).max(20),
  targetIssueTitle: z.string().optional(),
  field: z.string(),
  oldValue: z.string().optional(),
  newValue: z.string(),
  reasoning: z.string(),
});

export type CopilotProposedActionDto = z.infer<typeof CopilotProposedActionSchema>;

export const CopilotChatRequestSchema = z.object({
  projectId: z.string().uuid("Valid projectId is required"),
  query: z
    .string()
    .min(1, "Query is required")
    .max(1000, "Query cannot exceed 1000 characters"),
  history: z.array(ChatMessageSchema).max(6).default([]),
});

export type CopilotChatRequestDto = z.infer<typeof CopilotChatRequestSchema>;

export const CopilotResponseSchema = z.object({
  message: z.string(),
  suggestedAction: CopilotProposedActionSchema.optional().nullable(),
  actionId: z.string().uuid().optional().nullable(),
  suggestedFollowUps: z.array(z.string()).default([]),
});

export type CopilotResponseDto = z.infer<typeof CopilotResponseSchema>;

export const CommitCopilotActionSchema = z.object({
  actionId: z.string().uuid("Valid actionId is required"),
});

export type CommitCopilotActionDto = z.infer<typeof CommitCopilotActionSchema>;
