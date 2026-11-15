import { apiClient } from "./client";
import {
  SprintDto,
  CreateSprintDto,
  UpdateSprintDto,
  CompleteSprintDto,
} from "@workflow-ai/contracts";

export async function listSprints(
  workspaceId: string,
  projectId: string
): Promise<SprintDto[]> {
  return apiClient<SprintDto[]>(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}/sprints`
  );
}

export async function createSprint(
  workspaceId: string,
  data: CreateSprintDto
): Promise<SprintDto> {
  return apiClient<SprintDto>(
    `/api/v1/workspaces/${workspaceId}/projects/${data.projectId}/sprints`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function updateSprint(
  workspaceId: string,
  sprintId: string,
  data: UpdateSprintDto
): Promise<SprintDto> {
  return apiClient<SprintDto>(
    `/api/v1/workspaces/${workspaceId}/sprints/${sprintId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function completeSprint(
  workspaceId: string,
  sprintId: string,
  data: CompleteSprintDto
): Promise<{ id: string; name: string; status: string; rolledOverCount: number }> {
  return apiClient(
    `/api/v1/workspaces/${workspaceId}/sprints/${sprintId}/complete`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function deleteSprint(
  workspaceId: string,
  sprintId: string
): Promise<void> {
  return apiClient<void>(
    `/api/v1/workspaces/${workspaceId}/sprints/${sprintId}`,
    {
      method: "DELETE",
    }
  );
}
