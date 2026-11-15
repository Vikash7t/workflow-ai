import {
  DecomposeTaskRequestDto,
  DecomposeTaskPlanDto,
  AiActionDto,
  CommitAiActionDto,
} from "@workflow-ai/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function decomposeTasks(
  workspaceId: string,
  dto: DecomposeTaskRequestDto
): Promise<AiActionDto> {
  const res = await fetch(`${API_BASE}/workspaces/${workspaceId}/ai/decompose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(dto),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to decompose tasks with AI");
  }

  return res.json();
}

export async function getAiAction(
  workspaceId: string,
  actionId: string
): Promise<AiActionDto> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/ai/actions/${actionId}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to retrieve AI action");
  }

  return res.json();
}

export async function commitAiAction(
  workspaceId: string,
  actionId: string,
  dto: CommitAiActionDto
): Promise<{
  createdCount: number;
  epicId: string;
  epicKey: string;
  issueKeys: string[];
}> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/ai/actions/${actionId}/commit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(dto),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to commit AI action");
  }

  return res.json();
}
