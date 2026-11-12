import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";
import { OrganizationsService } from "./organizations.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationDto,
} from "@workflow-ai/contracts";

@ApiTags("Organizations")
@Controller("organizations")
@UseGuards(SessionAuthGuard)
@ApiCookieAuth("better-auth.session_token")
@ApiBearerAuth()
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new organization (creator assigned as OWNER)" })
  @ApiResponse({ status: 201, description: "Organization created" })
  async create(
    @CurrentUser("id") userId: string,
    @Body() dto: CreateOrganizationDto
  ): Promise<OrganizationDto> {
    return this.orgService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: "List all organizations the authenticated user belongs to" })
  @ApiResponse({ status: 200, description: "List of organizations" })
  async list(@CurrentUser("id") userId: string): Promise<OrganizationDto[]> {
    return this.orgService.listForUser(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get organization details by ID" })
  @ApiResponse({ status: 200, description: "Organization details" })
  async getById(
    @CurrentUser("id") userId: string,
    @Param("id") orgId: string
  ): Promise<OrganizationDto> {
    return this.orgService.getById(userId, orgId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update organization settings (Owner or Admin required)" })
  @ApiResponse({ status: 200, description: "Updated organization" })
  async update(
    @CurrentUser("id") userId: string,
    @Param("id") orgId: string,
    @Body() dto: UpdateOrganizationDto
  ): Promise<OrganizationDto> {
    return this.orgService.update(userId, orgId, dto);
  }
}
