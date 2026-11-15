import {
  CreateChannelMappingDto,
  ChannelMappingDto,
} from "@workflow-ai/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function listChannelMappings(
  workspaceId: string
): Promise<ChannelMappingDto[]> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/channels/mappings`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to list channel mappings");
  }

  return res.json();
}

export async function createChannelMapping(
  workspaceId: string,
  dto: CreateChannelMappingDto
): Promise<ChannelMappingDto> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/channels/mappings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create channel mapping");
  }

  return res.json();
}

export async function deleteChannelMapping(
  workspaceId: string,
  mappingId: string
): Promise<{ success: boolean }> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/channels/mappings/${mappingId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete channel mapping");
  }

  return res.json();
}
