import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";
import { MembersService } from "./members.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  InviteMemberDto,
  UpdateMemberRoleDto,
  AcceptInvitationDto,
  WorkspaceInvitationDto,
  WorkspaceMemberDto,
} from "@workflow-ai/contracts";

@ApiTags("Workspace Members & Invitations")
@Controller()
@UseGuards(SessionAuthGuard)
@ApiCookieAuth("better-auth.session_token")
@ApiBearerAuth()
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get("workspaces/:workspaceId/members")
  @UseGuards(WorkspaceAccessGuard)
  @ApiOperation({ summary: "List all active members in a workspace" })
  @ApiResponse({ status: 200, description: "List of workspace members" })
  async listMembers(
    @Param("workspaceId") workspaceId: string
  ): Promise<WorkspaceMemberDto[]> {
    return this.membersService.listWorkspaceMembers(workspaceId);
  }

  @Post("workspaces/:workspaceId/invitations")
  @UseGuards(WorkspaceAccessGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Send an invitation to join the workspace (Admin required)" })
  @ApiResponse({ status: 201, description: "Invitation created" })
  async inviteMember(
    @Param("workspaceId") workspaceId: string,
    @CurrentUser("id") inviterId: string,
    @Body() dto: InviteMemberDto
  ): Promise<WorkspaceInvitationDto> {
    return this.membersService.inviteMember(workspaceId, inviterId, dto);
  }

  @Get("workspaces/:workspaceId/invitations")
  @UseGuards(WorkspaceAccessGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "List all pending invitations for a workspace" })
  @ApiResponse({ status: 200, description: "List of invitations" })
  async listInvitations(
    @Param("workspaceId") workspaceId: string
  ): Promise<WorkspaceInvitationDto[]> {
    return this.membersService.listPendingInvitations(workspaceId);
  }

  @Delete("workspaces/:workspaceId/invitations/:invitationId")
  @UseGuards(WorkspaceAccessGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Revoke a pending invitation" })
  @ApiResponse({ status: 200, description: "Invitation revoked" })
  async revokeInvitation(
    @Param("workspaceId") workspaceId: string,
    @Param("invitationId") invitationId: string
  ): Promise<{ success: boolean }> {
    return this.membersService.revokeInvitation(workspaceId, invitationId);
  }

  @Post("invitations/accept")
  @ApiOperation({ summary: "Accept a workspace invitation using its secret token" })
  @ApiResponse({ status: 200, description: "Invitation accepted" })
  async acceptInvitation(
    @CurrentUser("id") userId: string,
    @Body() dto: AcceptInvitationDto
  ): Promise<{ workspaceId: string }> {
    return this.membersService.acceptInvitation(userId, dto.token);
  }

  @Patch("workspaces/:workspaceId/members/:memberId")
  @UseGuards(WorkspaceAccessGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Update a member's role in the workspace (Admin required)" })
  @ApiResponse({ status: 200, description: "Role updated" })
  async updateRole(
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string,
    @CurrentUser("id") requesterId: string,
    @Body() dto: UpdateMemberRoleDto
  ): Promise<WorkspaceMemberDto> {
    return this.membersService.updateMemberRole(workspaceId, memberId, dto.role, requesterId);
  }

  @Delete("workspaces/:workspaceId/members/:memberId")
  @UseGuards(WorkspaceAccessGuard, RolesGuard)
  @Roles("ADMIN")
  @ApiOperation({ summary: "Remove a member from the workspace (Admin required)" })
  @ApiResponse({ status: 200, description: "Member removed" })
  async removeMember(
    @Param("workspaceId") workspaceId: string,
    @Param("memberId") memberId: string,
    @CurrentUser("id") requesterId: string
  ): Promise<{ success: boolean }> {
    return this.membersService.removeMember(workspaceId, memberId, requesterId);
  }
}
