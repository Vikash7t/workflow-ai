import { apiClient } from "./client";
import {
  DuplicateDetectionRequestDto,
  DuplicateDetectionResponseDto,
  SemanticSearchQueryDto,
  SemanticSearchResponseDto,
} from "@workflow-ai/contracts";

export async function detectDuplicates(
  workspaceId: string,
  data: DuplicateDetectionRequestDto,
  signal?: AbortSignal
): Promise<DuplicateDetectionResponseDto> {
  return apiClient<DuplicateDetectionResponseDto>(
    `/api/v1/workspaces/${workspaceId}/search/duplicates`,
    {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }
  );
}

export async function searchSemantic(
  workspaceId: string,
  data: SemanticSearchQueryDto,
  signal?: AbortSignal
): Promise<SemanticSearchResponseDto> {
  return apiClient<SemanticSearchResponseDto>(
    `/api/v1/workspaces/${workspaceId}/search/semantic`,
    {
      method: "POST",
      body: JSON.stringify(data),
      signal,
    }
  );
}
