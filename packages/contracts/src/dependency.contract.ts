import { z } from "zod";
import { DependencyTypeEnum } from "./common.contract.js";

export const CreateDependencySchema = z.object({
  targetIssueId: z.string().uuid("Target issue ID must be a valid UUID"),
  type: DependencyTypeEnum.default("BLOCKS"),
});
export type CreateDependencyDto = z.infer<typeof CreateDependencySchema>;

export const IssueDependencyDtoSchema = z.object({
  id: z.string().uuid(),
  blockerIssueId: z.string().uuid(),
  blockedIssueId: z.string().uuid(),
  type: DependencyTypeEnum,
  createdAt: z.string(),
  blocker: z
    .object({
      id: z.string().uuid(),
      key: z.string(),
      title: z.string(),
      statusId: z.string().uuid(),
      statusName: z.string().optional(),
      category: z.string().optional(),
    })
    .optional(),
  blocked: z
    .object({
      id: z.string().uuid(),
      key: z.string(),
      title: z.string(),
      statusId: z.string().uuid(),
      statusName: z.string().optional(),
      category: z.string().optional(),
    })
    .optional(),
});
export type IssueDependencyDto = z.infer<typeof IssueDependencyDtoSchema>;
