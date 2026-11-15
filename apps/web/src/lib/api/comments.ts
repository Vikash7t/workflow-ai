import { apiClient } from "./client";
import { CommentDto } from "@workflow-ai/contracts";

export async function listComments(
  workspaceId: string,
  issueId: string
): Promise<CommentDto[]> {
  return apiClient<CommentDto[]>(
    `/api/v1/workspaces/${workspaceId}/issues/${issueId}/comments`
  );
}

export async function createComment(
  workspaceId: string,
  issueId: string,
  body: string
): Promise<CommentDto> {
  return apiClient<CommentDto>(
    `/api/v1/workspaces/${workspaceId}/issues/${issueId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    }
  );
}

export async function updateComment(
  workspaceId: string,
  commentId: string,
  body: string
): Promise<CommentDto> {
  return apiClient<CommentDto>(
    `/api/v1/workspaces/${workspaceId}/comments/${commentId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ body }),
    }
  );
}

export async function deleteComment(
  workspaceId: string,
  commentId: string
): Promise<void> {
  return apiClient<void>(
    `/api/v1/workspaces/${workspaceId}/comments/${commentId}`,
    {
      method: "DELETE",
    }
  );
}
