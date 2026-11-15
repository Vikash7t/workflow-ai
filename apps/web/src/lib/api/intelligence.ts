import { apiClient } from "./client";
import {
  DeliveryMetricsQueryDto,
  DeliveryMetricsResponseDto,
  SprintRiskAnalysisResponseDto,
  StandupReportRequestDto,
  StandupReportResponseDto,
} from "@workflow-ai/contracts";

export async function getProjectDeliveryMetrics(
  workspaceId: string,
  projectId: string,
  query?: DeliveryMetricsQueryDto
): Promise<DeliveryMetricsResponseDto> {
  const params = new URLSearchParams();
  if (query?.windowDays) {
    params.append("windowDays", String(query.windowDays));
  }
  const qs = params.toString() ? `?${params.toString()}` : "";
  return apiClient<DeliveryMetricsResponseDto>(
    `/api/v1/workspaces/${workspaceId}/intelligence/projects/${projectId}/metrics${qs}`
  );
}

export async function getSprintRisk(
  workspaceId: string,
  sprintId: string
): Promise<SprintRiskAnalysisResponseDto> {
  return apiClient<SprintRiskAnalysisResponseDto>(
    `/api/v1/workspaces/${workspaceId}/intelligence/sprints/${sprintId}/risk`
  );
}

export async function generateStandup(
  workspaceId: string,
  data: StandupReportRequestDto
): Promise<StandupReportResponseDto> {
  return apiClient<StandupReportResponseDto>(
    `/api/v1/workspaces/${workspaceId}/intelligence/standup`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}
