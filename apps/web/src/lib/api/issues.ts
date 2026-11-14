import { apiClient } from "./client";
import {
  IssueDto,
  CreateIssueDto,
  UpdateIssueDto,
  IssueFilterDto,
  BulkUpdateStatusDto,
  BulkUpdateAssigneeDto,
  BulkDeleteIssuesDto,
} from "@workflow-ai/contracts";

export interface PaginatedIssuesResponse {
  items: IssueDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function listIssues(
  workspaceId: string,
  filters: Partial<IssueFilterDto> = {}
): Promise<PaginatedIssuesResponse> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiClient<PaginatedIssuesResponse>(
    `/api/v1/workspaces/${workspaceId}/issues${query}`
  );
}

export async function getIssue(
  workspaceId: string,
  issueId: string
): Promise<IssueDto> {
  return apiClient<IssueDto>(
    `/api/v1/workspaces/${workspaceId}/issues/${issueId}`
  );
}

export async function createIssue(
  workspaceId: string,
  data: CreateIssueDto
): Promise<IssueDto> {
  return apiClient<IssueDto>(`/api/v1/workspaces/${workspaceId}/issues`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateIssue(
  workspaceId: string,
  issueId: string,
  data: UpdateIssueDto
): Promise<IssueDto> {
  return apiClient<IssueDto>(
    `/api/v1/workspaces/${workspaceId}/issues/${issueId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function deleteIssue(
  workspaceId: string,
  issueId: string
): Promise<void> {
  return apiClient<void>(
    `/api/v1/workspaces/${workspaceId}/issues/${issueId}`,
    {
      method: "DELETE",
    }
  );
}

export async function bulkUpdateStatus(
  workspaceId: string,
  data: BulkUpdateStatusDto
): Promise<{ count: number }> {
  return apiClient<{ count: number }>(
    `/api/v1/workspaces/${workspaceId}/issues/bulk/status`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function bulkUpdateAssignee(
  workspaceId: string,
  data: BulkUpdateAssigneeDto
): Promise<{ count: number }> {
  return apiClient<{ count: number }>(
    `/api/v1/workspaces/${workspaceId}/issues/bulk/assignee`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function bulkDeleteIssues(
  workspaceId: string,
  data: BulkDeleteIssuesDto
): Promise<{ count: number }> {
  return apiClient<{ count: number }>(
    `/api/v1/workspaces/${workspaceId}/issues/bulk`,
    {
      method: "DELETE",
      body: JSON.stringify(data),
    }
  );
}
