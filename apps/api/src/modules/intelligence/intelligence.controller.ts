import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { DeliveryIntelligenceService } from "./delivery-intelligence.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  DeliveryMetricsQuerySchema,
  DeliveryMetricsResponseDto,
  SprintRiskAnalysisResponseDto,
  StandupReportRequestSchema,
  StandupReportResponseDto,
} from "@workflow-ai/contracts";

@Controller("workspaces/:workspaceId/intelligence")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard, RolesGuard)
export class IntelligenceController {
  constructor(
    private readonly intelligenceService: DeliveryIntelligenceService
  ) {}

  @Get("projects/:projectId/metrics")
  @Roles("OWNER", "ADMIN", "MEMBER", "VIEWER")
  async getProjectMetrics(
    @Param("workspaceId") workspaceId: string,
    @Param("projectId") projectId: string,
    @Query() rawQuery: unknown
  ): Promise<DeliveryMetricsResponseDto> {
    const parseResult = DeliveryMetricsQuerySchema.safeParse(rawQuery);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: "Invalid metrics query parameters",
        errors: parseResult.error.format(),
      });
    }

    return this.intelligenceService.getProjectDeliveryMetrics(
      workspaceId,
      projectId,
      parseResult.data
    );
  }

  @Get("sprints/:sprintId/risk")
  @Roles("OWNER", "ADMIN", "MEMBER", "VIEWER")
  async getSprintRisk(
    @Param("workspaceId") workspaceId: string,
    @Param("sprintId") sprintId: string
  ): Promise<SprintRiskAnalysisResponseDto> {
    return this.intelligenceService.getSprintRiskAnalysis(
      workspaceId,
      sprintId
    );
  }

  @Post("standup")
  @Roles("OWNER", "ADMIN", "MEMBER", "VIEWER")
  async generateStandup(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown
  ): Promise<StandupReportResponseDto> {
    const parseResult = StandupReportRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: "Invalid standup report request",
        errors: parseResult.error.format(),
      });
    }

    return this.intelligenceService.generateStandupReport(
      workspaceId,
      parseResult.data
    );
  }
}
