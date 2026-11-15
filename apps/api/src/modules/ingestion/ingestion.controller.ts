import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Headers,
  Req,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { ExternalIngestionService } from "./external-ingestion.service";
import { ChannelRoutingService } from "./channel-routing.service";
import { SignatureVerificationService } from "./signature-verification.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import {
  CreateChannelMappingSchema,
  CreateChannelMappingDto,
  ChannelMappingDto,
} from "@workflow-ai/contracts";

@Controller()
export class IngestionController {
  constructor(
    private readonly ingestionService: ExternalIngestionService,
    private readonly channelRoutingService: ChannelRoutingService,
    private readonly signatureService: SignatureVerificationService
  ) {}

  // ---------------------------------------------------------------------------
  // Public Chat Ingestion Webhook Gateways
  // ---------------------------------------------------------------------------

  @Post("ingestion/slack/commands")
  async handleSlackCommand(
    @Headers("x-slack-signature") signature: string | undefined,
    @Headers("x-slack-request-timestamp") timestamp: string | undefined,
    @Body() body: any,
    @Req() req: any
  ) {
    const signingSecret = process.env.SLACK_SIGNING_SECRET;

    if (signingSecret && process.env.NODE_ENV !== "test") {
      const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(body);
      const isValid = this.signatureService.verifySlackSignature(
        signingSecret,
        signature,
        timestamp,
        rawBody
      );

      if (!isValid) {
        throw new UnauthorizedException("Invalid Slack HMAC signature or expired timestamp");
      }
    }

    return this.ingestionService.handleSlackCommand(body);
  }

  @Post("ingestion/discord/interactions")
  async handleDiscordInteraction(
    @Headers("x-signature-ed25519") signature: string | undefined,
    @Headers("x-signature-timestamp") timestamp: string | undefined,
    @Body() body: any,
    @Req() req: any
  ) {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;

    if (publicKey && process.env.NODE_ENV !== "test") {
      const rawBody = req.rawBody ? req.rawBody.toString("utf8") : JSON.stringify(body);
      const isValid = this.signatureService.verifyDiscordSignature(
        publicKey,
        signature,
        timestamp,
        rawBody
      );

      if (!isValid) {
        throw new UnauthorizedException("Invalid Discord Ed25519 signature");
      }
    }

    return this.ingestionService.handleDiscordInteraction(body);
  }

  // ---------------------------------------------------------------------------
  // Authenticated Channel-to-Project Routing Endpoints
  // ---------------------------------------------------------------------------

  @Get("workspaces/:workspaceId/channels/mappings")
  @UseGuards(SessionAuthGuard, WorkspaceAccessGuard, RolesGuard)
  @Roles("OWNER", "ADMIN", "MEMBER")
  async getChannelMappings(
    @Param("workspaceId") workspaceId: string
  ): Promise<ChannelMappingDto[]> {
    return this.channelRoutingService.getWorkspaceChannelMappings(workspaceId);
  }

  @Post("workspaces/:workspaceId/channels/mappings")
  @UseGuards(SessionAuthGuard, WorkspaceAccessGuard, RolesGuard)
  @Roles("OWNER", "ADMIN")
  async createChannelMapping(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown
  ): Promise<ChannelMappingDto> {
    const parseResult = CreateChannelMappingSchema.safeParse(body);
    if (!parseResult.success) {
      throw new BadRequestException({
        message: "Invalid channel mapping payload",
        errors: parseResult.error.format(),
      });
    }

    return this.channelRoutingService.createChannelMapping(
      workspaceId,
      parseResult.data
    );
  }

  @Delete("workspaces/:workspaceId/channels/mappings/:mappingId")
  @UseGuards(SessionAuthGuard, WorkspaceAccessGuard, RolesGuard)
  @Roles("OWNER", "ADMIN")
  async deleteChannelMapping(
    @Param("workspaceId") workspaceId: string,
    @Param("mappingId") mappingId: string
  ): Promise<{ success: boolean }> {
    return this.channelRoutingService.deleteChannelMapping(workspaceId, mappingId);
  }
}
