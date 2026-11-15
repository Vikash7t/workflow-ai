import {
  CopilotChatRequestDto,
  CopilotResponseDto,
} from "@workflow-ai/contracts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function sendCopilotMessage(
  workspaceId: string,
  dto: CopilotChatRequestDto
): Promise<CopilotResponseDto> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/copilot/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(dto),
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to communicate with Copilot");
  }

  return res.json();
}

export async function commitCopilotAction(
  workspaceId: string,
  actionId: string
): Promise<{ success: boolean; message: string; issueKey: string }> {
  const res = await fetch(
    `${API_BASE}/workspaces/${workspaceId}/copilot/actions/${actionId}/commit`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to apply Copilot action");
  }

  return res.json();
}
