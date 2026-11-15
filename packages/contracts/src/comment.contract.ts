import { z } from "zod";

export const CreateCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(10000, "Comment cannot exceed 10,000 characters"),
});
export type CreateCommentDto = z.infer<typeof CreateCommentSchema>;

export const UpdateCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(10000, "Comment cannot exceed 10,000 characters"),
});
export type UpdateCommentDto = z.infer<typeof UpdateCommentSchema>;

export const CommentDtoSchema = z.object({
  id: z.string().uuid(),
  issueId: z.string().uuid(),
  userId: z.string().uuid(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  user: z.object({
    id: z.string().uuid(),
    name: z.string().nullable(),
    email: z.string().email(),
    image: z.string().nullable().optional(),
  }),
});
export type CommentDto = z.infer<typeof CommentDtoSchema>;
