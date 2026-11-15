import {
  Controller,
  Post,
  Param,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
} from "@nestjs/common";
import { Request } from "express";
import { GitIntegrationsService } from "./git-integrations.service";
import { WebhookDeliveryResultDto } from "@workflow-ai/contracts";

@Controller("webhooks/integrations")
export class WebhooksController {
  constructor(private readonly service: GitIntegrationsService) {}

  @Post("github/:integrationId")
  @HttpCode(HttpStatus.OK)
  async handleGitHubWebhook(
    @Param("integrationId") integrationId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: RawBodyRequest<Request>
  ): Promise<WebhookDeliveryResultDto> {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    return this.service.handleWebhook(
      "GITHUB",
      integrationId,
      headers,
      rawBody,
      req.body
    );
  }

  @Post("gitlab/:integrationId")
  @HttpCode(HttpStatus.OK)
  async handleGitLabWebhook(
    @Param("integrationId") integrationId: string,
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Req() req: RawBodyRequest<Request>
  ): Promise<WebhookDeliveryResultDto> {
    const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
    return this.service.handleWebhook(
      "GITLAB",
      integrationId,
      headers,
      rawBody,
      req.body
    );
  }
}
