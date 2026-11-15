import { apiClient } from "./client";
import { DependencyType } from "@workflow-ai/contracts";

export interface DependencyItem {
  id: string;
  blockerIssueId: string;
  blockedIssueId: string;
  type: DependencyType;
  createdAt: string;
  issue: {
    id: string;
    key: string;
    title: string;
    statusId: string;
    statusName?: string;
    category?: string;
  };
}

export interface DependenciesResponse {
  blockedBy: DependencyItem[];
  blocking: DependencyItem[];
}

export async function listDependencies(
  workspaceId: string,
  issueId: string
): Promise<DependenciesResponse> {
  return apiClient<DependenciesResponse>(
    `/api/v1/workspaces/${workspaceId}/issues/${issueId}/dependencies`
  );
}

export async function addDependency(
  workspaceId: string,
  issueId: string,
  targetIssueId: string,
  type: DependencyType = "BLOCKS"
): Promise<any> {
  return apiClient<any>(
    `/api/v1/workspaces/${workspaceId}/issues/${issueId}/dependencies`,
    {
      method: "POST",
      body: JSON.stringify({ targetIssueId, type }),
    }
  );
}

export async function removeDependency(
  workspaceId: string,
  dependencyId: string
): Promise<void> {
  return apiClient<void>(
    `/api/v1/workspaces/${workspaceId}/dependencies/${dependencyId}`,
    {
      method: "DELETE",
    }
  );
}
