import { apiClient } from "./client";
import {
  WorkspaceDto,
  WorkspaceMemberDto,
} from "@workflow-ai/contracts";

export async function listWorkspaces(): Promise<WorkspaceDto[]> {
  return apiClient<WorkspaceDto[]>("/api/v1/workspaces");
}

export async function listWorkspaceMembers(
  workspaceId: string
): Promise<WorkspaceMemberDto[]> {
  return apiClient<WorkspaceMemberDto[]>(
    `/api/v1/workspaces/${workspaceId}/members`
  );
}
