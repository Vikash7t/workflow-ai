import {
  Controller,
  Post,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { SemanticSearchService } from "./semantic-search.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  DuplicateDetectionRequestSchema,
  DuplicateDetectionResponseDto,
  SemanticSearchQuerySchema,
  SemanticSearchResponseDto,
} from "@workflow-ai/contracts";

@Controller("workspaces/:workspaceId/search")
@UseGuards(SessionAuthGuard, WorkspaceAccessGuard, RolesGuard)
export class SearchController {
  constructor(private readonly semanticSearchService: SemanticSearchService) {}

  @Post("duplicates")
  @Roles("OWNER", "ADMIN", "MEMBER", "VIEWER")
  async detectDuplicates(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown
  ): Promise<DuplicateDetectionResponseDto> {
    const parseResult = DuplicateDetectionRequestSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: "Invalid duplicate detection request",
        errors: parseResult.error.format(),
      });
    }

    return this.semanticSearchService.detectDuplicates(workspaceId, parseResult.data);
  }

  @Post("semantic")
  @Roles("OWNER", "ADMIN", "MEMBER", "VIEWER")
  async searchSemantic(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown
  ): Promise<SemanticSearchResponseDto> {
    const parseResult = SemanticSearchQuerySchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: "Invalid semantic search request",
        errors: parseResult.error.format(),
      });
    }

    return this.semanticSearchService.searchSemantic(workspaceId, parseResult.data);
  }
}
