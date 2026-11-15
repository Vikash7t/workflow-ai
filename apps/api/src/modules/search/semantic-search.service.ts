import {
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  EmbeddingService,
  computeContentHash,
  cosineSimilarity,
} from "./embedding.service";
import {
  DuplicateDetectionRequestDto,
  DuplicateDetectionResponseDto,
  DuplicateMatchDto,
  SemanticSearchQueryDto,
  SemanticSearchResponseDto,
  SemanticSearchResultItemDto,
  Priority,
  IssueType,
  WorkflowCategory,
} from "@workflow-ai/contracts";

@Injectable()
export class SemanticSearchService {
  private readonly logger = new Logger(SemanticSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: EmbeddingService
  ) {}

  /**
   * Generates and stores a vector embedding for an issue.
   * Compares contentHash to skip re-computation if unchanged.
   */
  async upsertIssueEmbedding(
    issueId: string,
    workspaceId: string,
    projectId: string,
    title: string,
    description?: string | null
  ): Promise<void> {
    try {
      const contentHash = computeContentHash(title, description);

      const existing = await this.prisma.issueEmbedding.findUnique({
        where: { issueId },
        select: { id: true, contentHash: true },
      });

      if (existing && existing.contentHash === contentHash) {
        // Content unchanged; skip expensive embedding generation
        return;
      }

      const combinedText = `${title}\n${description || ""}`;
      const vectorData = await this.embeddingService.generateEmbedding(combinedText);

      await this.prisma.issueEmbedding.upsert({
        where: { issueId },
        create: {
          issueId,
          workspaceId,
          projectId,
          contentHash,
          model: "text-embedding-004",
          vectorData,
        },
        update: {
          contentHash,
          vectorData,
          updatedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to generate embedding for issue ${issueId}: ${err.message}`,
        err.stack
      );
    }
  }

  /**
   * Real-time duplicate detection for draft issues.
   * Compares vector similarity against existing project issues.
   */
  async detectDuplicates(
    workspaceId: string,
    dto: DuplicateDetectionRequestDto
  ): Promise<DuplicateDetectionResponseDto> {
    // 1. Validate project belongs to workspace (IDOR / BOLA Guard)
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException("Project not found in this workspace");
    }

    // 2. Short / Low-Signal input guard: Require min 4 chars and 2 words
    const combinedText = `${dto.title.trim()} ${dto.description?.trim() || ""}`.trim();
    const words = combinedText.split(/\s+/).filter((w) => w.length > 0);
    if (dto.title.trim().length < 4 || words.length < 2) {
      return {
        hasDuplicates: false,
        highestConfidence: "NONE",
        matches: [],
      };
    }

    // 3. Generate query vector
    const queryVector = await this.embeddingService.generateEmbedding(combinedText);

    // 4. Query candidate embeddings in target workspace & project (Strict Tenant Isolation)
    const candidates = await this.prisma.issueEmbedding.findMany({
      where: {
        workspaceId,
        projectId: dto.projectId,
        ...(dto.excludeIssueId ? { issueId: { not: dto.excludeIssueId } } : {}),
      },
      include: {
        issue: {
          include: {
            status: true,
          },
        },
      },
    });

    const matches: DuplicateMatchDto[] = [];

    for (const item of candidates) {
      if (!item.issue || !item.vectorData || item.vectorData.length === 0) {
        continue;
      }

      const similarity = cosineSimilarity(queryVector, item.vectorData);

      // Filtering thresholds: >= 0.70 for candidates
      if (similarity >= 0.70) {
        const confidence = similarity >= 0.80 ? "HIGH" : "MEDIUM";
        matches.push({
          issueId: item.issue.id,
          key: item.issue.key,
          title: item.issue.title,
          priority: item.issue.priority as Priority,
          status: {
            id: item.issue.status?.id,
            name: item.issue.status?.name || "Unknown",
            category: (item.issue.status?.category as WorkflowCategory) || "UNSTARTED",
            color: item.issue.status?.color,
          },
          similarity: Math.round(similarity * 100) / 100,
          confidence,
        });
      }
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    const topMatches = matches.slice(0, 5);

    const highestConfidence =
      topMatches.length === 0
        ? "NONE"
        : topMatches.some((m) => m.confidence === "HIGH")
        ? "HIGH"
        : "MEDIUM";

    return {
      hasDuplicates: topMatches.length > 0,
      highestConfidence,
      matches: topMatches,
    };
  }

  /**
   * Tenant-scoped semantic search with integrated relational filters.
   */
  async searchSemantic(
    workspaceId: string,
    dto: SemanticSearchQueryDto
  ): Promise<SemanticSearchResponseDto> {
    // 1. Verify project exists in this workspace
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException("Project not found in this workspace");
    }

    // 2. Generate embedding for search query
    const queryVector = await this.embeddingService.generateEmbedding(dto.query);

    // 3. Assemble relational filters for underlying issues
    const issueWhere: any = {
      workspaceId,
      projectId: dto.projectId,
    };

    if (dto.statusId) issueWhere.statusId = dto.statusId;
    if (dto.sprintId) issueWhere.sprintId = dto.sprintId;
    if (dto.assigneeId) issueWhere.assigneeId = dto.assigneeId;
    if (dto.priority) issueWhere.priority = dto.priority;
    if (dto.type) issueWhere.type = dto.type;
    if (!dto.includeCompleted) {
      issueWhere.status = { category: { not: "COMPLETED" } };
    }

    // 4. Fetch candidate embeddings
    const candidates = await this.prisma.issueEmbedding.findMany({
      where: {
        workspaceId,
        projectId: dto.projectId,
        issue: issueWhere,
      },
      include: {
        issue: {
          include: {
            status: true,
            assignee: true,
          },
        },
      },
    });

    const threshold = dto.threshold ?? 0.6;
    const scoredResults: SemanticSearchResultItemDto[] = [];

    for (const item of candidates) {
      if (!item.issue || !item.vectorData || item.vectorData.length === 0) {
        continue;
      }

      const similarity = cosineSimilarity(queryVector, item.vectorData);

      if (similarity >= threshold) {
        scoredResults.push({
          issueId: item.issue.id,
          key: item.issue.key,
          title: item.issue.title,
          description: item.issue.description,
          priority: item.issue.priority as Priority,
          type: item.issue.type as IssueType,
          status: {
            id: item.issue.status?.id,
            name: item.issue.status?.name || "Unknown",
            category: (item.issue.status?.category as WorkflowCategory) || "UNSTARTED",
            color: item.issue.status?.color,
          },
          assignee: item.issue.assignee
            ? {
                id: item.issue.assignee.id,
                name: item.issue.assignee.name,
                email: item.issue.assignee.email,
                image: item.issue.assignee.image,
              }
            : null,
          similarity: Math.round(similarity * 100) / 100,
        });
      }
    }

    scoredResults.sort((a, b) => b.similarity - a.similarity);
    const limit = dto.limit ?? 10;
    const paginated = scoredResults.slice(0, limit);

    return {
      total: scoredResults.length,
      results: paginated,
    };
  }
}
