import { apiClient } from "./client";
import {
  ProjectDto,
  CreateProjectDto,
  UpdateProjectDto,
} from "@workflow-ai/contracts";

export async function listProjects(workspaceId: string): Promise<ProjectDto[]> {
  return apiClient<ProjectDto[]>(`/api/v1/workspaces/${workspaceId}/projects`);
}

export async function getProject(
  workspaceId: string,
  projectId: string
): Promise<ProjectDto> {
  return apiClient<ProjectDto>(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}`
  );
}

export async function createProject(
  workspaceId: string,
  data: CreateProjectDto
): Promise<ProjectDto> {
  return apiClient<ProjectDto>(`/api/v1/workspaces/${workspaceId}/projects`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  workspaceId: string,
  projectId: string,
  data: UpdateProjectDto
): Promise<ProjectDto> {
  return apiClient<ProjectDto>(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
    {
      method: "PATCH",
      body: JSON.stringify(data),
    }
  );
}

export async function deleteProject(
  workspaceId: string,
  projectId: string
): Promise<void> {
  return apiClient<void>(
    `/api/v1/workspaces/${workspaceId}/projects/${projectId}`,
    {
      method: "DELETE",
    }
  );
}
