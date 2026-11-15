import {
  CreateGitIntegrationDto,
  UpdateGitIntegrationDto,
  GitIntegrationDto,
  CreatedGitIntegrationDto,
} from "@workflow-ai/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function createGitIntegration(
  workspaceId: string,
  dto: CreateGitIntegrationDto
): Promise<CreatedGitIntegrationDto> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/integrations/git`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(dto),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create Git integration");
  }

  return res.json();
}

export async function listGitIntegrations(
  workspaceId: string,
  projectId?: string
): Promise<GitIntegrationDto[]> {
  const url = new URL(`${API_BASE}/workspaces/${workspaceId}/integrations/git`);
  if (projectId) {
    url.searchParams.set("projectId", projectId);
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to list Git integrations");
  }

  return res.json();
}

export async function updateGitIntegration(
  workspaceId: string,
  integrationId: string,
  dto: UpdateGitIntegrationDto
): Promise<GitIntegrationDto> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/integrations/git/${integrationId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(dto),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update Git integration");
  }

  return res.json();
}

export async function deleteGitIntegration(
  workspaceId: string,
  integrationId: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/integrations/git/${integrationId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete Git integration");
  }

  return res.json();
}
