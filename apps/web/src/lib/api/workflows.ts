import { apiClient } from "./client";
import {
  WorkflowStatusDto,
  CreateWorkflowStatusDto,
  UpdateWorkflowStatusDto,
} from "@workflow-ai/contracts";

export async function listWorkflowStatuses(
  workspaceId: string,
  projectId: string
): Promise<WorkflowStatusDto[]> {
  return apiClient<WorkflowStatusDto[]>(
    `/api/v1/workspaces/${workspaceId}/workflows/statuses?projectId=${projectId}`
  );
}

export async function createWorkflowStatus(
  workspaceId: string,
  data: CreateWorkflowStatusDto
): Promise<WorkflowStatusDto> {
  return apiClient<WorkflowStatusDto>(
    `/api/v1/workspaces/${workspaceId}/workflows/statuses`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updateWorkflowStatus(
  workspaceId: string,
  statusId: string,
  data: UpdateWorkflowStatusDto
): Promise<WorkflowStatusDto> {
  return apiClient<WorkflowStatusDto>(
    `/api/v1/workspaces/${workspaceId}/workflows/statuses/${statusId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function reorderWorkflowStatuses(
  workspaceId: string,
  projectId: string,
  statusIds: string[]
): Promise<WorkflowStatusDto[]> {
  return apiClient<WorkflowStatusDto[]>(
    `/api/v1/workspaces/${workspaceId}/workflows/statuses/reorder`,
    {
      method: "PATCH",
      body: JSON.stringify({ projectId, statusIds }),
    }
  );
}

export async function deleteWorkflowStatus(
  workspaceId: string,
  statusId: string
): Promise<void> {
  return apiClient<void>(
    `/api/v1/workspaces/${workspaceId}/workflows/statuses/${statusId}`,
    {
      method: "DELETE",
    }
  );
}
