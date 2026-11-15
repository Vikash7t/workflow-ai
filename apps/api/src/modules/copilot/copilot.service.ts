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
  CopilotChatRequestDto,
  CopilotResponseDto,
  CopilotProposedActionDto,
  CopilotResponseSchema,
} from "@workflow-ai/contracts";
import {
  COPILOT_SYSTEM_PROMPT,
  formatCopilotPrompt,
} from "./copilot.prompts";
import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

@Injectable()
export class CopilotService {
  private readonly logger = new Logger(CopilotService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deterministic rule-based mock engine for local dev, testing, or when API key is unset.
   */
  public mockCopilotEngine(
    query: string,
    issues: any[],
    activeSprint: any,
    statuses: any[],
    members: any[]
  ): {
    message: string;
    suggestedAction: CopilotProposedActionDto | null;
    suggestedFollowUps: string[];
  } {
    const q = query.toLowerCase();

    // 1. Move Issue Intent (e.g. "move ENG-101 to Done" or "set ENG-101 to In Progress")
    const moveMatch = query.match(/(?:move|set|change status of)\s+([A-Za-z]{2,10}-\d+)\s+to\s+([A-Za-z\s]+)/i);
    if (moveMatch) {
      const targetKey = moveMatch[1].toUpperCase();
      const rawTargetStatus = moveMatch[2].trim();
      const targetIssue = issues.find((i) => i.key === targetKey);
      const matchedStatus = statuses.find(
        (s) => s.name.toLowerCase() === rawTargetStatus.toLowerCase()
      ) || statuses.find((s) => s.category.toLowerCase() === rawTargetStatus.toLowerCase());

      if (targetIssue && matchedStatus) {
        return {
          message: `I can help you transition **${targetKey}** ("${targetIssue.title}") from **${targetIssue.status.name}** to **${matchedStatus.name}**. Please review and confirm the action below.`,
          suggestedAction: {
            actionType: "MOVE_ISSUE",
            targetIssueKey: targetKey,
            targetIssueTitle: targetIssue.title,
            field: "statusId",
            oldValue: targetIssue.status.name,
            newValue: matchedStatus.name,
            reasoning: `User requested transition to ${matchedStatus.name}`,
          },
          suggestedFollowUps: [
            `What issues are blocking ${targetKey}?`,
            `Show active sprint summary`,
          ],
        };
      }
    }

    // 2. Change Priority Intent (e.g. "make ENG-101 P0" or "set priority of ENG-101 to P1")
    const priorityMatch = query.match(/(?:make|set priority of|change priority of)\s+([A-Za-z]{2,10}-\d+)\s+(?:to\s+)?(P[0-3])/i);
    if (priorityMatch) {
      const targetKey = priorityMatch[1].toUpperCase();
      const newPriority = priorityMatch[2].toUpperCase();
      const targetIssue = issues.find((i) => i.key === targetKey);

      if (targetIssue) {
        return {
          message: `I've prepared an action to elevate priority on **${targetKey}** ("${targetIssue.title}") from **${targetIssue.priority}** to **${newPriority}**.`,
          suggestedAction: {
            actionType: "UPDATE_PRIORITY",
            targetIssueKey: targetKey,
            targetIssueTitle: targetIssue.title,
            field: "priority",
            oldValue: targetIssue.priority,
            newValue: newPriority,
            reasoning: `Elevate priority to ${newPriority}`,
          },
          suggestedFollowUps: [
            `Who is assigned to ${targetKey}?`,
            `List all P0 issues`,
          ],
        };
      }
    }

    // 3. Blockers / Dependencies Query
    if (q.includes("block") || q.includes("dependency") || q.includes("blocked")) {
      const blockedIssues = issues.filter((i) => i.blockedByKeys.length > 0);
      if (blockedIssues.length === 0) {
        return {
          message: "🎉 Great news! There are currently **no blocked issues** in this scope. All tasks have clear dependency paths.",
          suggestedAction: null,
          suggestedFollowUps: [
            "What issues are currently in progress?",
            "Summarize the active sprint",
          ],
        };
      }

      const list = blockedIssues
        .map((i) => `- **${i.key}** ("${i.title}") is blocked by **${i.blockedByKeys.join(", ")}**`)
        .join("\n");

      return {
        message: `Here are the currently blocked issues:\n\n${list}\n\nWould you like me to prioritize resolving any of these blockers?`,
        suggestedAction: null,
        suggestedFollowUps: [
          `Show details for ${blockedIssues[0]?.blockedByKeys[0]}`,
          "List all P0 issues",
        ],
      };
    }

    // 4. Sprint Summary Query
    if (q.includes("sprint") || q.includes("summary") || q.includes("progress") || q.includes("overview")) {
      const total = issues.length;
      const completed = issues.filter((i) => i.status.category === "COMPLETED").length;
      const inProgress = issues.filter((i) => i.status.category === "STARTED").length;
      const unstarted = total - completed - inProgress;
      const sprintName = activeSprint ? activeSprint.name : "Active Project Issues";

      return {
        message: `### 📊 ${sprintName} Summary\n` +
          `- **Total Issues:** ${total}\n` +
          `- **Completed:** ${completed} (${total > 0 ? Math.round((completed / total) * 100) : 0}%)\n` +
          `- **In Progress:** ${inProgress}\n` +
          `- **To Do / Backlog:** ${unstarted}\n\n` +
          (activeSprint?.goal ? `*Sprint Goal: "${activeSprint.goal}"*` : ""),
        suggestedAction: null,
        suggestedFollowUps: [
          "What issues are blocked?",
          "Show P0 critical tickets",
        ],
      };
    }

    // 5. P0 / Urgent Tickets Query
    if (q.includes("p0") || q.includes("urgent") || q.includes("critical")) {
      const p0s = issues.filter((i) => i.priority === "P0");
      if (p0s.length === 0) {
        return {
          message: "There are currently **no P0 (critical)** issues open in this project scope.",
          suggestedAction: null,
          suggestedFollowUps: [
            "Show P1 high priority tickets",
            "Show sprint summary",
          ],
        };
      }

      const list = p0s
        .map((i) => `- **${i.key}**: "${i.title}" (${i.status.name}, Assignee: ${i.assignee?.name || "Unassigned"})`)
        .join("\n");

      return {
        message: `Found **${p0s.length} critical (P0)** issue(s):\n\n${list}`,
        suggestedAction: null,
        suggestedFollowUps: [
          `Who is assigned to ${p0s[0]?.key}?`,
          "What issues are blocked?",
        ],
      };
    }

    // Default general response
    return {
      message: `I'm analyzing project **${issues[0]?.key?.split("-")[0] || "tasks"}** with **${issues.length} active issues**. You can ask me to summarize sprint progress, list blockers, check P0 tickets, or propose moving issues (e.g. "Move ${issues[0]?.key || "ENG-101"} to Done").`,
      suggestedAction: null,
      suggestedFollowUps: [
        "What are the current blockers?",
        "Show active sprint summary",
        "List all P0 issues",
      ],
    };
  }

  /**
   * Process a conversational query with contextual grounding and optional action proposal.
   */
  async chat(
    workspaceId: string,
    userId: string,
    dto: CopilotChatRequestDto
  ): Promise<CopilotResponseDto> {
    const startTime = Date.now();

    // 1. Verify project exists in workspace
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });
    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException("Project not found in this workspace");
    }

    // 2. Build Bounded, Least-Privilege Context
    const activeSprint = await this.prisma.sprint.findFirst({
      where: {
        workspaceId,
        projectId: dto.projectId,
        status: "ACTIVE",
      },
    });

    const statuses = await this.prisma.workflowStatus.findMany({
      where: { workspaceId },
      orderBy: { position: "asc" },
      select: { id: true, name: true, category: true },
    });

    const membersRaw = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    const members = membersRaw.map((m) => ({
      id: m.userId,
      name: m.user.name || m.user.email.split("@")[0],
      role: m.role,
    }));

    // Bounded issue fetch (active sprint or top 30 recent)
    const rawIssues = await this.prisma.issue.findMany({
      where: {
        workspaceId,
        projectId: dto.projectId,
        ...(activeSprint ? { sprintId: activeSprint.id } : {}),
      },
      take: activeSprint ? 50 : 30,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        key: true,
        title: true,
        type: true,
        priority: true,
        statusId: true,
        status: { select: { id: true, name: true, category: true } },
        assignee: { select: { id: true, name: true } },
        blockedBy: {
          select: {
            blocker: { select: { key: true } },
          },
        },
        blocking: {
          select: {
            blocked: { select: { key: true } },
          },
        },
      },
    });

    const issues = rawIssues.map((i) => ({
      id: i.id,
      key: i.key,
      title: i.title.slice(0, 100),
      type: i.type,
      priority: i.priority,
      statusId: i.statusId,
      status: i.status,
      assignee: i.assignee,
      blockedByKeys: i.blockedBy.map((b) => b.blocker.key),
      blockingKeys: i.blocking.map((b) => b.blocked.key),
    }));

    let message = "";
    let suggestedAction: CopilotProposedActionDto | null = null;
    let suggestedFollowUps: string[] = [];
    let provider = "mock";
    let model = "mock-copilot-v1";
    let promptTokens = Math.ceil(dto.query.length / 4);
    let completionTokens = 150;
    let status: "SUCCESS" | "FAILED" = "SUCCESS";
    let errorMessage: string | null = null;

    try {
      if (env.GEMINI_API_KEY && process.env.NODE_ENV !== "test") {
        provider = "google";
        model = "gemini-1.5-flash";

        const google = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
        const prompt = formatCopilotPrompt(
          project,
          activeSprint,
          statuses,
          members,
          issues,
          dto.history,
          dto.query
        );

        const result = await generateObject({
          model: google(model),
          system: COPILOT_SYSTEM_PROMPT,
          prompt,
          schema: CopilotResponseSchema,
        });

        message = result.object.message;
        suggestedAction = result.object.suggestedAction || null;
        suggestedFollowUps = result.object.suggestedFollowUps || [];

        if (result.usage) {
          const u = result.usage as any;
          promptTokens = u.promptTokens ?? u.inputTokens ?? promptTokens;
          completionTokens = u.completionTokens ?? u.outputTokens ?? completionTokens;
        }
      } else {
        const mockResult = this.mockCopilotEngine(
          dto.query,
          issues,
          activeSprint,
          statuses,
          members
        );
        message = mockResult.message;
        suggestedAction = mockResult.suggestedAction;
        suggestedFollowUps = mockResult.suggestedFollowUps;
      }
    } catch (err: any) {
      this.logger.error(`Copilot execution failed: ${err.message}`, err.stack);
      status = "FAILED";
      errorMessage = err.message || "Unknown Copilot error";

      const fallback = this.mockCopilotEngine(
        dto.query,
        issues,
        activeSprint,
        statuses,
        members
      );
      message = fallback.message;
      suggestedAction = fallback.suggestedAction;
      suggestedFollowUps = fallback.suggestedFollowUps;
    }

    const latencyMs = Date.now() - startTime;
    const totalTokens = promptTokens + completionTokens;
    const estimatedCostUSD = (promptTokens * 0.000000075) + (completionTokens * 0.0000003);

    // 3. Log Audit
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

    let actionId: string | null = null;

    // 4. If an action is proposed, persist ephemeral AiSessionAction (15 mins TTL)
    if (suggestedAction) {
      const targetIssue = issues.find((i) => i.key === suggestedAction!.targetIssueKey);
      if (targetIssue) {
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins TTL
        const sessionAction = await this.prisma.aiSessionAction.create({
          data: {
            workspaceId,
            projectId: dto.projectId,
            userId,
            actionType: "COPILOT_ACTION",
            rawInput: dto.query,
            plan: {
              ...suggestedAction,
              targetIssueId: targetIssue.id,
            } as any,
            status: "PROPOSED",
            expiresAt,
          },
        });
        actionId = sessionAction.id;
      }
    }

    return {
      message,
      suggestedAction,
      actionId,
      suggestedFollowUps,
    };
  }

  /**
   * Commit a proposed Copilot state mutation with optimistic concurrency and stale-state guards.
   */
  async commitAction(
    workspaceId: string,
    userId: string,
    actionId: string
  ): Promise<{
    success: boolean;
    message: string;
    issueKey: string;
  }> {
    // 1. Compound lookup with workspace boundary check
    const action = await this.prisma.aiSessionAction.findFirst({
      where: { id: actionId, workspaceId },
    });

    if (!action) {
      throw new NotFoundException("Copilot action proposal not found in this workspace");
    }

    if (action.status !== "PROPOSED") {
      throw new BadRequestException(`Action is already in '${action.status}' state`);
    }

    if (new Date() > action.expiresAt) {
      await this.prisma.aiSessionAction.update({
        where: { id: actionId },
        data: { status: "EXPIRED" },
      });
      throw new GoneException("Action proposal has expired. Please ask Copilot again.");
    }

    const plan = action.plan as unknown as CopilotProposedActionDto & {
      targetIssueId: string;
    };

    // 2. Atomic Transaction: Verify target issue containment and execute mutation
    const result = await this.prisma.$transaction(async (tx) => {
      const issue = await tx.issue.findFirst({
        where: {
          id: plan.targetIssueId,
          workspaceId,
          projectId: action.projectId, // Strict project containment
        },
        include: { status: true },
      });

      if (!issue) {
        throw new NotFoundException("Target issue not found in authorized project");
      }

      let updatedData: any = {};
      let fieldChanged = plan.field;
      let oldValue = plan.oldValue || "";
      let newValue = plan.newValue;

      if (plan.actionType === "MOVE_ISSUE") {
        // Resolve target status by name or category
        const targetStatus = await tx.workflowStatus.findFirst({
          where: {
            workspaceId,
            OR: [
              { name: { equals: plan.newValue, mode: "insensitive" } },
              { category: { equals: plan.newValue, mode: "insensitive" } },
            ],
          },
        });

        if (!targetStatus) {
          throw new BadRequestException(`Target workflow status '${plan.newValue}' not found`);
        }

        // Stale-state / No-Op check
        if (issue.statusId === targetStatus.id) {
          await tx.aiSessionAction.update({
            where: { id: actionId },
            data: { status: "COMMITTED", committedAt: new Date() },
          });
          return {
            success: true,
            message: `Issue ${issue.key} is already in '${targetStatus.name}'.`,
            issueKey: issue.key,
          };
        }

        updatedData.statusId = targetStatus.id;
        oldValue = issue.status.name;
        newValue = targetStatus.name;
      } else if (plan.actionType === "UPDATE_PRIORITY") {
        if (issue.priority === plan.newValue) {
          await tx.aiSessionAction.update({
            where: { id: actionId },
            data: { status: "COMMITTED", committedAt: new Date() },
          });
          return {
            success: true,
            message: `Issue ${issue.key} is already ${plan.newValue}.`,
            issueKey: issue.key,
          };
        }
        updatedData.priority = plan.newValue;
        oldValue = issue.priority;
      } else if (plan.actionType === "ASSIGN_ISSUE") {
        // Resolve assignee
        const member = await tx.workspaceMember.findFirst({
          where: {
            workspaceId,
            user: { name: { contains: plan.newValue, mode: "insensitive" } },
          },
        });
        if (!member) {
          throw new BadRequestException(`User '${plan.newValue}' is not a member of this workspace`);
        }
        updatedData.assigneeId = member.userId;
      }

      // Apply update
      await tx.issue.update({
        where: { id: issue.id },
        data: updatedData,
      });

      // Record Activity Log
      await tx.activityLog.create({
        data: {
          issueId: issue.id,
          userId,
          action: plan.actionType === "MOVE_ISSUE" ? "STATUS_CHANGED" : "UPDATED",
          metadata: {
            source: "COPILOT_ACTION",
            actionId: action.id,
            field: fieldChanged,
            oldValue,
            newValue,
            reasoning: plan.reasoning,
          },
        },
      });

      // Mark action committed
      await tx.aiSessionAction.update({
        where: { id: actionId },
        data: { status: "COMMITTED", committedAt: new Date() },
      });

      return {
        success: true,
        message: `Successfully applied changes to ${issue.key} (${fieldChanged}: ${newValue}).`,
        issueKey: issue.key,
      };
    });

    return result;
  }
}
