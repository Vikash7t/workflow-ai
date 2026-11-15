import { apiClient } from "./client";
import { ActivityLogDto } from "@workflow-ai/contracts";

export async function getIssueActivities(
  workspaceId: string,
  issueId: string
): Promise<ActivityLogDto[]> {
  return apiClient<ActivityLogDto[]>(
    `/api/v1/workspaces/${workspaceId}/issues/${issueId}/activities`
  );
}
