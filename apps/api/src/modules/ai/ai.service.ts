import {
  Injectable,
  NotFoundException,
  BadRequestException,
  GoneException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { env } from "../../config/env.config";
import {
  DecomposeTaskRequestDto,
  DecomposeTaskPlanDto,
  DecomposeTaskPlanSchema,
  AiActionDto,
  CommitAiActionDto,
} from "@workflow-ai/contracts";
import {
  TASK_DECOMPOSITION_SYSTEM_PROMPT,
  formatDecompositionPrompt,
} from "./ai.prompts";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministic mock decomposer for local testing, CI, or when API key is unset.
   */
  public mockDecomposer(rawText: string): DecomposeTaskPlanDto {
    const cleaned = rawText.trim().replace(/\r?\n+/g, " ");
    const preview = cleaned.slice(0, 60).replace(/[^\w\s-]/g, "").trim() || "New Feature Initiative";
    const epicTitle = `Epic: ${preview.charAt(0).toUpperCase() + preview.slice(1)}`;

    return {
      epicTitle,
      epicDescription: `Decomposed from raw requirements:\n> ${cleaned.slice(0, 300)}...`,
      items: [
        {
          title: `Architect data contracts and schema for ${preview}`,
          type: "TASK",
          priority: "P1",
          estimate: 3,
          description: "Define shared TypeScript contracts and Prisma migrations.",
          acceptanceCriteria: [
            "Zod schemas exported from contracts package",
            "Database migration applied cleanly with zero data loss",
          ],
        },
        {
          title: `Implement backend core services and endpoints for ${preview}`,
          type: "STORY",
          priority: "P1",
          estimate: 5,
          description: "Build NestJS controllers, services, and multi-tenant authorization guards.",
          acceptanceCriteria: [
            "All endpoints guarded with session and workspace guards",
            "Domain invariant unit tests passing with 100% coverage",
          ],
        },
        {
          title: `Build interactive frontend UI and state management for ${preview}`,
          type: "STORY",
          priority: "P2",
          estimate: 5,
          description: "Create Next.js components, TanStack Query hooks, and responsive UX.",
          acceptanceCriteria: [
            "Optimistic updates for state mutations",
            "Accessible keyboard navigation and error boundaries",
          ],
        },
        {
          title: `Automate end-to-end verification and QA audit for ${preview}`,
          type: "TASK",
          priority: "P2",
          estimate: 2,
          description: "Verify edge cases, security boundaries, and multi-tenancy isolation.",
          acceptanceCriteria: [
            "OWASP BOLA/IDOR security audit passes",
            "Production Next.js build succeeds cleanly",
          ],
        },
      ],
    };
  }

  /**
   * Step 1: Decompose raw requirements into a structured, ephemeral proposed action.
   */
  async decomposeTasks(
    workspaceId: string,
    userId: string,
    dto: DecomposeTaskRequestDto
  ): Promise<AiActionDto> {
    const startTime = Date.now();

    // 1. Verify project exists in workspace
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException("Project not found in this workspace");
    }

    // 2. Verify sprint exists (if specified)
    if (dto.sprintId) {
      const sprint = await this.prisma.sprint.findUnique({
        where: { id: dto.sprintId },
      });
      if (!sprint || sprint.workspaceId !== workspaceId || sprint.projectId !== dto.projectId) {
        throw new BadRequestException("Sprint not found in the target project");
      }
    }

    let plan: DecomposeTaskPlanDto;
    let provider = "mock";
    let model = "mock-decomposer-v1";
    let promptTokens = Math.ceil(dto.rawText.length / 4);
    let completionTokens = 250;
    let status: "SUCCESS" | "FAILED" = "SUCCESS";
    let errorMessage: string | null = null;

    try {
      if (env.GEMINI_API_KEY && process.env.NODE_ENV !== "test") {
        provider = "google";
        model = "gemini-1.5-flash";

        const google = createGoogleGenerativeAI({
          apiKey: env.GEMINI_API_KEY,
        });

        const result = await generateObject({
          model: google(model),
          system: TASK_DECOMPOSITION_SYSTEM_PROMPT,
          prompt: formatDecompositionPrompt(dto.rawText),
          schema: DecomposeTaskPlanSchema,
        });

        plan = result.object;
        if (result.usage) {
          const usageAny = result.usage as any;
          promptTokens = usageAny.promptTokens ?? usageAny.inputTokens ?? promptTokens;
          completionTokens = usageAny.completionTokens ?? usageAny.outputTokens ?? completionTokens;
        }
      } else {
        // Fallback to deterministic mock decomposer
        plan = this.mockDecomposer(dto.rawText);
      }
    } catch (err: any) {
      this.logger.error(`AI Task Decomposition failed: ${err.message}`, err.stack);
      status = "FAILED";
      errorMessage = err.message || "Unknown LLM execution error";

      // Fallback gracefully to mock decomposer if live LLM fails
      plan = this.mockDecomposer(dto.rawText);
    }

    const latencyMs = Date.now() - startTime;
    const totalTokens = promptTokens + completionTokens;
    // Estimated cost: ~$0.075 per 1M input tokens, $0.30 per 1M output tokens for Gemini Flash
    const estimatedCostUSD = (promptTokens * 0.000000075) + (completionTokens * 0.0000003);

    // 3. Record Audit Log
    await this.prisma.aiRequestAudit.create({
      data: {
        workspaceId,
        userId,
        provider,
        model,
        promptTokens,
        completionTokens,
        totalTokens,
        estimatedCostUSD,
        latencyMs,
        status,
        errorMessage,
      },
    });

    // 4. Save ephemeral AiSessionAction (24-hour TTL)
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionAction = await this.prisma.aiSessionAction.create({
      data: {
        workspaceId,
        projectId: dto.projectId,
        userId,
        actionType: "DECOMPOSE_TASKS",
        rawInput: dto.rawText,
        plan: plan as any,
        status: "PROPOSED",
        expiresAt,
      },
    });

    return this.mapToDto(sessionAction);
  }

  /**
   * Fetch a proposed AI action by ID with expiration enforcement.
   */
  async getAction(workspaceId: string, actionId: string): Promise<AiActionDto> {
    const action = await this.prisma.aiSessionAction.findFirst({
      where: { id: actionId, workspaceId },
    });

    if (!action) {
      throw new NotFoundException("AI action proposal not found in this workspace");
    }

    if (action.status === "PROPOSED" && new Date() > action.expiresAt) {
      await this.prisma.aiSessionAction.update({
        where: { id: actionId },
        data: { status: "EXPIRED" },
      });
      throw new GoneException("AI action proposal has expired. Please regenerate.");
    }

    return this.mapToDto(action);
  }

  /**
   * Step 2: Human-in-the-Loop Confirmation & Transactional Batch Commit.
   */
  async commitAction(
    workspaceId: string,
    userId: string,
    actionId: string,
    dto: CommitAiActionDto
  ): Promise<{
    createdCount: number;
    epicId: string;
    epicKey: string;
    issueKeys: string[];
  }> {
    // 1. Compound lookup with workspace boundary check
    const action = await this.prisma.aiSessionAction.findFirst({
      where: { id: actionId, workspaceId },
      include: { project: true },
    });

    if (!action) {
      throw new NotFoundException("AI action proposal not found in this workspace");
    }

    if (action.status !== "PROPOSED") {
      throw new BadRequestException(
        `AI action cannot be committed because it is in '${action.status}' state`
      );
    }

    if (new Date() > action.expiresAt) {
      await this.prisma.aiSessionAction.update({
        where: { id: actionId },
        data: { status: "EXPIRED" },
      });
      throw new GoneException("AI action proposal has expired. Please regenerate.");
    }

    // 2. Validate target sprint (if specified)
    const targetSprintId = dto.sprintId;
    if (targetSprintId) {
      const sprint = await this.prisma.sprint.findUnique({
        where: { id: targetSprintId },
      });
      if (!sprint || sprint.workspaceId !== workspaceId || sprint.projectId !== action.projectId) {
        throw new BadRequestException("Target sprint not found in the same project");
      }
    }

    // 3. Resolve default workflow status for project workspace
    const defaultStatus =
      (await this.prisma.workflowStatus.findFirst({
        where: { workspaceId, isDefault: true },
      })) ||
      (await this.prisma.workflowStatus.findFirst({
        where: { workspaceId },
        orderBy: { position: "asc" },
      }));

    if (!defaultStatus) {
      throw new BadRequestException("No workflow status configured in this workspace");
    }

    const itemsToCreate = dto.items;
    const totalNewIssues = 1 + itemsToCreate.length; // 1 Epic + N items
    const rawPlan = action.plan as unknown as DecomposeTaskPlanDto;

    // 4. Atomic Transaction: allocate consecutive sequence numbers and bulk create
    const result = await this.prisma.$transaction(async (tx) => {
      // Concurrency-safe atomic increment of project issue counter
      const updatedProj = await tx.project.update({
        where: { id: action.projectId },
        data: {
          issueCounter: {
            increment: totalNewIssues,
          },
        },
      });

      const endNumber = updatedProj.issueCounter;
      const startNumber = endNumber - totalNewIssues + 1;

      // 4a. Create the parent Epic
      const epicNumber = startNumber;
      const epicKey = `${action.project.key}-${epicNumber}`;
      const epic = await tx.issue.create({
        data: {
          projectId: action.projectId,
          workspaceId,
          issueNumber: epicNumber,
          key: epicKey,
          type: "EPIC",
          title: rawPlan.epicTitle,
          description: rawPlan.epicDescription || null,
          priority: "P1",
          statusId: defaultStatus.id,
          sprintId: targetSprintId || null,
          reporterId: userId,
        },
      });

      await tx.activityLog.create({
        data: {
          issueId: epic.id,
          userId,
          action: "CREATED",
          metadata: {
            source: "AI_DECOMPOSITION",
            actionId: action.id,
          },
        },
      });

      const createdKeys: string[] = [epicKey];

      // 4b. Create each decomposed sub-item linked to the Epic
      for (let i = 0; i < itemsToCreate.length; i++) {
        const item = itemsToCreate[i];
        const itemNumber = startNumber + 1 + i;
        const itemKey = `${action.project.key}-${itemNumber}`;

        // Format description with acceptance criteria checklist
        let itemDescription = item.description || "";
        if (item.acceptanceCriteria && item.acceptanceCriteria.length > 0) {
          itemDescription += "\n\n### Acceptance Criteria\n" +
            item.acceptanceCriteria.map((c) => `- [ ] ${c}`).join("\n");
        }

        const createdItem = await tx.issue.create({
          data: {
            projectId: action.projectId,
            workspaceId,
            issueNumber: itemNumber,
            key: itemKey,
            type: item.type,
            title: item.title,
            description: itemDescription.trim(),
            priority: item.priority,
            estimate: item.estimate || null,
            statusId: defaultStatus.id,
            parentId: epic.id,
            sprintId: targetSprintId || null,
            reporterId: userId,
          },
        });

        await tx.activityLog.create({
          data: {
            issueId: createdItem.id,
            userId,
            action: "CREATED",
            metadata: {
              source: "AI_DECOMPOSITION",
              actionId: action.id,
            },
          },
        });

        createdKeys.push(itemKey);
      }

      // 4c. Mark session action as COMMITTED
      await tx.aiSessionAction.update({
        where: { id: actionId },
        data: {
          status: "COMMITTED",
          committedAt: new Date(),
        },
      });

      return {
        createdCount: totalNewIssues,
        epicId: epic.id,
        epicKey,
        issueKeys: createdKeys,
      };
    });

    return result;
  }

  private mapToDto(action: any): AiActionDto {
    return {
      id: action.id,
      workspaceId: action.workspaceId,
      projectId: action.projectId,
      userId: action.userId,
      actionType: action.actionType as any,
      rawInput: action.rawInput,
      plan: action.plan as any,
      status: action.status as any,
      expiresAt: action.expiresAt.toISOString(),
      committedAt: action.committedAt ? action.committedAt.toISOString() : null,
      createdAt: action.createdAt.toISOString(),
      updatedAt: action.updatedAt.toISOString(),
    };
  }
}
