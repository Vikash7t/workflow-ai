import {
  Injectable,
  Logger,
  Optional,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { ChannelRoutingService } from "./channel-routing.service";
import { SemanticSearchService } from "../search/semantic-search.service";
import { Priority, PriorityEnum } from "@workflow-ai/contracts";

interface ProcessedEventRecord {
  issueKey: string;
  issueId: string;
  title: string;
  timestamp: number;
}

@Injectable()
export class ExternalIngestionService {
  private readonly logger = new Logger(ExternalIngestionService.name);

  // In-memory idempotency deduplication cache (15-minute TTL)
  private readonly processedEvents = new Map<string, ProcessedEventRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly channelRoutingService: ChannelRoutingService,
    @Optional() private readonly semanticSearchService?: SemanticSearchService
  ) {}

  /**
   * Cleans entries older than 15 minutes to prevent memory leaks.
   */
  private cleanDeduplicationCache(): void {
    const cutoff = Date.now() - 15 * 60 * 1000;
    for (const [key, record] of this.processedEvents.entries()) {
      if (record.timestamp < cutoff) {
        this.processedEvents.delete(key);
      }
    }
  }

  /**
   * Sanitizes Slack mrkdwn (<@U1234|name>, <https://...|text>) into standard Markdown.
   */
  public sanitizeSlackText(text: string): string {
    if (!text) return "";
    return text
      .replace(/<@(U[A-Z0-9]+)\|([^>]+)>/g, "@$2")
      .replace(/<@(U[A-Z0-9]+)>/g, "@user")
      .replace(/<#(C[A-Z0-9]+)\|([^>]+)>/g, "#$2")
      .replace(/<([^|>]+)\|([^>]+)>/g, "[$2]($1)")
      .replace(/<([^>]+)>/g, "$1")
      .trim();
  }

  /**
   * Parses command line input into title, optional description, and priority flag.
   * e.g. "Fix payment webhook failure --p0 Critical bug details"
   */
  public parseCommandInput(rawText: string): {
    title: string;
    description: string;
    priority: Priority;
  } {
    let cleaned = (rawText || "").trim();
    let priority: Priority = "P2";

    // Extract flags: --p0, --p1, --p2, --p3 (use horizontal whitespace to preserve line breaks)
    const flagMatch = cleaned.match(/(?:^|[ \t])--(p[0-3])(?=[ \t]|\r?\n|$)/i);
    if (flagMatch) {
      const parsedP = flagMatch[1].toUpperCase();
      if (PriorityEnum.safeParse(parsedP).success) {
        priority = parsedP as Priority;
      }
      cleaned = cleaned.replace(/(?:^|[ \t])--(p[0-3])(?=[ \t]|\r?\n|$)/i, "").trim();
    }

    const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const title = lines[0] ? lines[0].slice(0, 255).trim() : "";
    const description = lines.slice(1).join("\n").trim();

    return { title, description, priority };
  }

  /**
   * Handles incoming Slack Slash Command (`/workflow`, `/issue`, `/ticket`).
   */
  async handleSlackCommand(payload: {
    command: string;
    text: string;
    user_id: string;
    user_name: string;
    channel_id: string;
    channel_name?: string;
    trigger_id: string;
  }): Promise<{ response_type: "in_channel" | "ephemeral"; text: string }> {
    this.cleanDeduplicationCache();

    // 1. Idempotency Check
    if (payload.trigger_id && this.processedEvents.has(payload.trigger_id)) {
      const existing = this.processedEvents.get(payload.trigger_id)!;
      return {
        response_type: "in_channel",
        text: `✅ Issue **${existing.issueKey}** ("${existing.title}") has already been created.`,
      };
    }

    // 2. Channel Route Lookup
    const mapping = await this.channelRoutingService.findMapping("SLACK", payload.channel_id);
    if (!mapping) {
      return {
        response_type: "ephemeral",
        text: `⚠️ Channel **#${payload.channel_name || payload.channel_id}** is not linked to any Workflow AI project.\nAn Admin can map this channel to a project under Workspace Settings > Integrations.`,
      };
    }

    // 3. Command Parsing & Validation
    const parsed = this.parseCommandInput(payload.text);
    if (!parsed.title || parsed.title.length < 3) {
      return {
        response_type: "ephemeral",
        text: `ℹ️ **Usage:** \`${payload.command} <title> [--p0|--p1|--p2|--p3]\`\nExample: \`${payload.command} Fix checkout button on Safari --p1\``,
      };
    }

    // 4. Resolve Author Attribution
    const reporterId = await this.resolveAuthor(
      mapping.workspaceId,
      payload.user_name
    );

    // 5. Determine Workflow Status
    const defaultStatus = mapping.defaultStatusId
      ? await this.prisma.workflowStatus.findUnique({ where: { id: mapping.defaultStatusId } })
      : await this.prisma.workflowStatus.findFirst({
          where: { workspaceId: mapping.workspaceId, isDefault: true },
        }) ||
        (await this.prisma.workflowStatus.findFirst({
          where: { workspaceId: mapping.workspaceId },
          orderBy: { position: "asc" },
        }));

    if (!defaultStatus) {
      return {
        response_type: "ephemeral",
        text: "❌ Error: No valid workflow status found for this workspace.",
      };
    }

    // 6. Atomic Issue Creation
    const priority = parsed.priority || (mapping.defaultPriority as Priority) || "P2";
    const description = [
      parsed.description,
      `*Reported via Slack by @${payload.user_name} in #${payload.channel_name || payload.channel_id}*`,
    ]
      .filter(Boolean)
      .join("\n\n");

    const createdIssue = await this.prisma.$transaction(async (tx) => {
      const updatedProj = await tx.project.update({
        where: { id: mapping.projectId },
        data: { issueCounter: { increment: 1 } },
        select: { issueCounter: true, key: true },
      });

      const issueNumber = updatedProj.issueCounter;
      const key = `${updatedProj.key}-${issueNumber}`;

      const issue = await tx.issue.create({
        data: {
          projectId: mapping.projectId,
          workspaceId: mapping.workspaceId,
          issueNumber,
          key,
          type: "TASK",
          title: parsed.title,
          description,
          priority,
          statusId: defaultStatus.id,
          reporterId,
        },
      });

      await tx.activityLog.create({
        data: {
          issueId: issue.id,
          userId: reporterId,
          action: "CREATED",
          metadata: {
            key,
            title: issue.title,
            source: "SLACK_INGESTION",
            slackUserId: payload.user_id,
            slackUsername: payload.user_name,
            channelId: payload.channel_id,
          },
        },
      });

      return issue;
    });

    // 7. Store in Deduplication Cache
    if (payload.trigger_id) {
      this.processedEvents.set(payload.trigger_id, {
        issueKey: createdIssue.key,
        issueId: createdIssue.id,
        title: createdIssue.title,
        timestamp: Date.now(),
      });
    }

    // 8. Non-blocking embedding generation
    if (this.semanticSearchService) {
      this.semanticSearchService
        .upsertIssueEmbedding(
          createdIssue.id,
          mapping.workspaceId,
          mapping.projectId,
          createdIssue.title,
          createdIssue.description
        )
        .catch(() => {});
    }

    return {
      response_type: "in_channel",
      text: `🎉 Created **[${createdIssue.key}]** "${createdIssue.title}" in **${mapping.project.name}** (${priority}, Status: ${defaultStatus.name}).`,
    };
  }

  /**
   * Handles incoming Discord Interaction (Application Command & Ping/Pong).
   */
  async handleDiscordInteraction(body: {
    type: number;
    id?: string;
    channel_id?: string;
    data?: {
      name: string;
      options?: Array<{ name: string; value: string }>;
    };
    member?: {
      user?: { id: string; username: string };
    };
    user?: { id: string; username: string };
  }): Promise<any> {
    // Discord Handshake Type 1 (PING) -> Respond with Type 1 (PONG)
    if (body.type === 1) {
      return { type: 1 };
    }

    const channelId = body.channel_id;
    if (!channelId) {
      return {
        type: 4,
        data: { content: "❌ Missing channel context in Discord interaction." },
      };
    }

    const mapping = await this.channelRoutingService.findMapping("DISCORD", channelId);
    if (!mapping) {
      return {
        type: 4,
        data: {
          content: "⚠️ This Discord channel is not linked to any Workflow AI project. An Admin can map it under Workspace Settings > Integrations.",
          flags: 64, // Ephemeral flag
        },
      };
    }

    const discordUser = body.member?.user || body.user;
    const username = discordUser?.username || "discord_user";

    // Extract title from command options
    const titleOption = body.data?.options?.find((o) => o.name === "title");
    const rawTitle = titleOption?.value || "New task from Discord";
    const parsed = this.parseCommandInput(rawTitle);

    const reporterId = await this.resolveAuthor(mapping.workspaceId, username);

    const defaultStatus = mapping.defaultStatusId
      ? await this.prisma.workflowStatus.findUnique({ where: { id: mapping.defaultStatusId } })
      : await this.prisma.workflowStatus.findFirst({
          where: { workspaceId: mapping.workspaceId, isDefault: true },
        }) ||
        (await this.prisma.workflowStatus.findFirst({
          where: { workspaceId: mapping.workspaceId },
          orderBy: { position: "asc" },
        }));

    if (!defaultStatus) {
      return {
        type: 4,
        data: { content: "❌ No valid workflow status found for this project." },
      };
    }

    const createdIssue = await this.prisma.$transaction(async (tx) => {
      const updatedProj = await tx.project.update({
        where: { id: mapping.projectId },
        data: { issueCounter: { increment: 1 } },
        select: { issueCounter: true, key: true },
      });

      const issueNumber = updatedProj.issueCounter;
      const key = `${updatedProj.key}-${issueNumber}`;

      const issue = await tx.issue.create({
        data: {
          projectId: mapping.projectId,
          workspaceId: mapping.workspaceId,
          issueNumber,
          key,
          type: "TASK",
          title: parsed.title,
          description: `Reported via Discord by @${username}`,
          priority: parsed.priority || (mapping.defaultPriority as Priority) || "P2",
          statusId: defaultStatus.id,
          reporterId,
        },
      });

      await tx.activityLog.create({
        data: {
          issueId: issue.id,
          userId: reporterId,
          action: "CREATED",
          metadata: {
            key,
            title: issue.title,
            source: "DISCORD_INGESTION",
            discordUsername: username,
            channelId,
          },
        },
      });

      return issue;
    });

    if (this.semanticSearchService) {
      this.semanticSearchService
        .upsertIssueEmbedding(
          createdIssue.id,
          mapping.workspaceId,
          mapping.projectId,
          createdIssue.title,
          createdIssue.description
        )
        .catch(() => {});
    }

    return {
      type: 4,
      data: {
        content: `🎉 Created **[${createdIssue.key}]** "${createdIssue.title}" in **${mapping.project.name}**!`,
      },
    };
  }

  /**
   * Resolves reporterId: looks for a workspace member with matching username/email,
   * falling back to the first Admin/Owner in the workspace.
   */
  private async resolveAuthor(workspaceId: string, externalUsername?: string): Promise<string> {
    if (externalUsername) {
      const matchedUser = await this.prisma.user.findFirst({
        where: {
          OR: [
            { email: { contains: externalUsername, mode: "insensitive" } },
            { name: { contains: externalUsername, mode: "insensitive" } },
          ],
          wsMemberships: {
            some: { workspaceId },
          },
        },
        select: { id: true },
      });

      if (matchedUser) {
        return matchedUser.id;
      }
    }

    // Fallback: designated workspace Admin/Owner
    const adminMember = await this.prisma.workspaceMember.findFirst({
      where: {
        workspaceId,
        role: { in: ["OWNER", "ADMIN"] },
      },
      select: { userId: true },
    });

    if (adminMember) {
      return adminMember.userId;
    }

    const anyMember = await this.prisma.workspaceMember.findFirst({
      where: { workspaceId },
      select: { userId: true },
    });

    return anyMember?.userId || "00000000-0000-0000-0000-000000000000";
  }
}
