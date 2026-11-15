import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { env } from "../../config/env.config";
import {
  CreateGitIntegrationDto,
  UpdateGitIntegrationDto,
  GitIntegrationDto,
  CreatedGitIntegrationDto,
  WebhookDeliveryResultDto,
} from "@workflow-ai/contracts";
import {
  verifyGitHubSignature,
  verifyGitLabToken,
  generateIntegrationSecret,
  maskSecret,
} from "./crypto.util";
import { extractKeysFromWebhookPayload } from "./key-extractor.util";

@Injectable()
export class GitIntegrationsService {
  private readonly logger = new Logger(GitIntegrationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a new Git repository integration (GitHub or GitLab).
   * Generates a cryptographically strong Webhook secret returned ONLY ONCE upon creation.
   */
  async createIntegration(
    workspaceId: string,
    dto: CreateGitIntegrationDto
  ): Promise<CreatedGitIntegrationDto> {
    const project = await this.prisma.project.findUnique({
      where: { id: dto.projectId },
    });

    if (!project || project.workspaceId !== workspaceId) {
      throw new NotFoundException("Project not found in this workspace");
    }

    // Check for existing integration on same repository and provider
    const existing = await this.prisma.gitIntegration.findUnique({
      where: {
        projectId_provider_repository: {
          projectId: dto.projectId,
          provider: dto.provider,
          repository: dto.repository.toLowerCase(),
        },
      },
    });

    if (existing) {
      throw new BadRequestException(
        `An integration for repository '${dto.repository}' already exists in this project`
      );
    }

    const plaintextSecret = generateIntegrationSecret();

    const integration = await this.prisma.gitIntegration.create({
      data: {
        workspaceId,
        projectId: dto.projectId,
        provider: dto.provider,
        repository: dto.repository.toLowerCase(),
        secret: plaintextSecret,
        enabled: true,
      },
    });

    const webhookUrl = `${env.BETTER_AUTH_URL}/api/v1/webhooks/integrations/${dto.provider.toLowerCase()}/${integration.id}`;

    return {
      id: integration.id,
      workspaceId: integration.workspaceId,
      projectId: integration.projectId,
      provider: integration.provider as any,
      repository: integration.repository,
      maskedSecret: maskSecret(plaintextSecret),
      plaintextSecret,
      webhookUrl,
      enabled: integration.enabled,
      createdAt: integration.createdAt.toISOString(),
      updatedAt: integration.updatedAt.toISOString(),
    };
  }

  /**
   * List all Git integrations for a workspace (secrets masked for security).
   */
  async listIntegrations(
    workspaceId: string,
    projectId?: string
  ): Promise<GitIntegrationDto[]> {
    const integrations = await this.prisma.gitIntegration.findMany({
      where: {
        workspaceId,
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return integrations.map((i) => ({
      id: i.id,
      workspaceId: i.workspaceId,
      projectId: i.projectId,
      provider: i.provider as any,
      repository: i.repository,
      maskedSecret: maskSecret(i.secret),
      enabled: i.enabled,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    }));
  }

  /**
   * Toggle enabled status of an integration.
   */
  async updateIntegration(
    workspaceId: string,
    integrationId: string,
    dto: UpdateGitIntegrationDto
  ): Promise<GitIntegrationDto> {
    const integration = await this.prisma.gitIntegration.findFirst({
      where: { id: integrationId, workspaceId },
    });

    if (!integration) {
      throw new NotFoundException("Git integration not found in this workspace");
    }

    const updated = await this.prisma.gitIntegration.update({
      where: { id: integrationId },
      data: {
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
      },
    });

    return {
      id: updated.id,
      workspaceId: updated.workspaceId,
      projectId: updated.projectId,
      provider: updated.provider as any,
      repository: updated.repository,
      maskedSecret: maskSecret(updated.secret),
      enabled: updated.enabled,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  /**
   * Delete an integration and all its webhook event history.
   */
  async deleteIntegration(
    workspaceId: string,
    integrationId: string
  ): Promise<{ success: boolean }> {
    const integration = await this.prisma.gitIntegration.findFirst({
      where: { id: integrationId, workspaceId },
    });

    if (!integration) {
      throw new NotFoundException("Git integration not found in this workspace");
    }

    await this.prisma.gitIntegration.delete({
      where: { id: integrationId },
    });

    return { success: true };
  }

  /**
   * Public Webhook Ingestion Engine:
   * - Validates HMAC-SHA256 signature against raw body buffer
   * - Performs atomic deduplication
   * - Extracts issue keys strictly within project boundary
   * - Executes state progression and records activity trail
   */
  async handleWebhook(
    provider: "GITHUB" | "GITLAB",
    integrationId: string,
    headers: Record<string, string | string[] | undefined>,
    rawBody: Buffer | string | undefined,
    payload: any
  ): Promise<WebhookDeliveryResultDto> {
    // 1. Resolve integration
    const integration = await this.prisma.gitIntegration.findUnique({
      where: { id: integrationId },
      include: { project: true },
    });

    if (!integration || !integration.enabled) {
      throw new NotFoundException("Integration not found or currently disabled");
    }

    if (integration.provider !== provider) {
      throw new BadRequestException(`Integration provider mismatch: expected ${integration.provider}`);
    }

    // 2. Cryptographic signature check (timing-safe)
    let isSignatureValid = false;
    if (provider === "GITHUB") {
      const sigHeader = (headers["x-hub-signature-256"] || headers["X-Hub-Signature-256"]) as string;
      isSignatureValid = verifyGitHubSignature(rawBody, sigHeader, integration.secret);
    } else {
      const tokenHeader = (headers["x-gitlab-token"] || headers["X-Gitlab-Token"]) as string;
      isSignatureValid = verifyGitLabToken(tokenHeader, integration.secret);
    }

    if (!isSignatureValid) {
      this.logger.warn(`Rejected untrusted/forged webhook for integration ${integrationId}`);
      throw new UnauthorizedException("Invalid webhook cryptographic signature");
    }

    // 3. Resolve delivery ID
    const rawDeliveryId =
      (headers["x-github-delivery"] as string) ||
      (headers["x-gitlab-event-uuid"] as string) ||
      payload?.after ||
      payload?.checkout_sha ||
      `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const deliveryId = String(rawDeliveryId);

    // 4. Resolve event type
    const eventType = String(
      headers["x-github-event"] ||
      headers["x-gitlab-event"] ||
      "push"
    );

    // 5. Idempotent Deduplication Check
    try {
      await this.prisma.webhookEvent.create({
        data: {
          integrationId,
          deliveryId,
          eventType,
          payload: payload || {},
          status: "RECEIVED",
        },
      });
    } catch (err: any) {
      // P2002: Unique constraint violation on [integrationId, deliveryId]
      if (err.code === "P2002") {
        this.logger.log(`Ignoring duplicate webhook delivery ${deliveryId}`);
        return {
          deliveryId,
          status: "DUPLICATE",
          extractedKeys: [],
          transitionedIssues: [],
        };
      }
      throw err;
    }

    // Ping events require no issue transitions
    if (eventType === "ping") {
      await this.prisma.webhookEvent.update({
        where: { integrationId_deliveryId: { integrationId, deliveryId } },
        data: { status: "PROCESSED", processedAt: new Date() },
      });
      return {
        deliveryId,
        status: "PROCESSED",
        extractedKeys: [],
        transitionedIssues: [],
      };
    }

    // 6. Extract issue keys from Git payload
    const extractedKeys = extractKeysFromWebhookPayload(provider, eventType, payload);

    if (extractedKeys.length === 0) {
      await this.prisma.webhookEvent.update({
        where: { integrationId_deliveryId: { integrationId, deliveryId } },
        data: { status: "IGNORED", processedAt: new Date() },
      });
      return {
        deliveryId,
        status: "IGNORED",
        extractedKeys: [],
        transitionedIssues: [],
      };
    }

    // 7. Determine state machine transition target
    let targetCategory: "STARTED" | "COMPLETED" | null = null;
    let eventDescription = "";
    let prUrl = "";

    // GitHub Pull Request logic
    if (provider === "GITHUB" && eventType === "pull_request") {
      prUrl = payload.pull_request?.html_url || "";
      const action = payload.action;

      if (action === "closed" && payload.pull_request?.merged === true) {
        targetCategory = "COMPLETED"; // Merged -> Done
        eventDescription = `Merged pull request #${payload.pull_request.number}: ${payload.pull_request.title}`;
      } else if (action === "opened" || action === "reopened") {
        targetCategory = "STARTED"; // Opened -> In Progress / In Review
        eventDescription = `Opened pull request #${payload.pull_request.number}: ${payload.pull_request.title}`;
      }
    }

    // GitLab Merge Request logic
    if (provider === "GITLAB" && (eventType === "Merge Request Hook" || eventType === "merge_request")) {
      prUrl = payload.object_attributes?.url || "";
      const state = payload.object_attributes?.state;
      const action = payload.object_attributes?.action;

      if (state === "merged" || action === "merge") {
        targetCategory = "COMPLETED";
        eventDescription = `Merged merge request !${payload.object_attributes.iid}: ${payload.object_attributes.title}`;
      } else if (state === "opened" || action === "open" || action === "reopen") {
        targetCategory = "STARTED";
        eventDescription = `Opened merge request !${payload.object_attributes.iid}: ${payload.object_attributes.title}`;
      }
    }

    // Push commits logic
    if ((eventType === "push" || eventType === "Push Hook") && !targetCategory) {
      targetCategory = "STARTED";
      const branch = payload.ref ? payload.ref.replace("refs/heads/", "") : "branch";
      const commitCount = Array.isArray(payload.commits) ? payload.commits.length : 1;
      eventDescription = `Pushed ${commitCount} commit(s) to ${branch}`;
    }

    // 8. Resolve target status from workspace statuses by category
    let targetStatus = null;
    if (targetCategory) {
      if (targetCategory === "COMPLETED") {
        targetStatus = await this.prisma.workflowStatus.findFirst({
          where: {
            workspaceId: integration.workspaceId,
            category: "COMPLETED",
          },
          orderBy: { position: "desc" },
        });
      } else if (targetCategory === "STARTED") {
        // Prefer "Review" status if this is a PR/MR opened event
        if (eventType === "pull_request" || eventType === "Merge Request Hook") {
          targetStatus = await this.prisma.workflowStatus.findFirst({
            where: {
              workspaceId: integration.workspaceId,
              name: { contains: "Review", mode: "insensitive" },
            },
          });
        }

        // Fallback to primary STARTED status
        if (!targetStatus) {
          targetStatus = await this.prisma.workflowStatus.findFirst({
            where: {
              workspaceId: integration.workspaceId,
              category: "STARTED",
            },
            orderBy: { position: "asc" },
          });
        }
      }
    }

    const transitionedIssues: string[] = [];

    // 9. Mutate issues strictly scoped to integration's project & workspace
    for (const key of extractedKeys) {
      const issue = await this.prisma.issue.findFirst({
        where: {
          key,
          projectId: integration.projectId, // Strict project containment
          workspaceId: integration.workspaceId, // Strict workspace containment
        },
        include: { status: true },
      });

      if (!issue) {
        // Key belongs to a different project or doesn't exist — skip
        continue;
      }

      // Check if status should transition
      const shouldTransition =
        targetStatus &&
        issue.statusId !== targetStatus.id &&
        issue.status.category !== "COMPLETED"; // Don't regress completed issues on push

      if (shouldTransition && targetStatus) {
        await this.prisma.$transaction(async (tx) => {
          // Update issue status
          await tx.issue.update({
            where: { id: issue.id },
            data: { statusId: targetStatus.id },
          });

          // Record Activity Log
          await tx.activityLog.create({
            data: {
              issueId: issue.id,
              userId: null, // Automated system actor
              action: "STATUS_CHANGED",
              metadata: {
                source: `${provider}_WEBHOOK`,
                provider,
                eventType,
                oldStatus: issue.status.name,
                newStatus: targetStatus.name,
                eventDescription,
                prUrl,
                deliveryId,
              },
            },
          });

          // Add traceability comment referencing the Git event
          if (eventDescription) {
            await tx.comment.create({
              data: {
                issueId: issue.id,
                userId: issue.reporterId, // Attributed via reporter context
                body: `🔗 **${provider} Activity:** ${eventDescription}${prUrl ? `\n\n[View on ${provider}](${prUrl})` : ""}`,
              },
            });
          }
        });

        transitionedIssues.push(issue.key);
      }
    }

    // 10. Mark WebhookEvent as processed
    await this.prisma.webhookEvent.update({
      where: { integrationId_deliveryId: { integrationId, deliveryId } },
      data: {
        status: "PROCESSED",
        processedAt: new Date(),
      },
    });

    return {
      deliveryId,
      status: "PROCESSED",
      extractedKeys,
      transitionedIssues,
    };
  }
}
