import {
  Controller,
  All,
  Req,
  Res,
  Get,
  Patch,
  Body,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiCookieAuth } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { toNodeHandler } from "better-auth/node";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { UpdateUserProfileDto, UserProfileDto } from "@workflow-ai/contracts";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth("better-auth.session_token")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user profile" })
  @ApiResponse({ status: 200, description: "Current user profile" })
  async getCurrentUser(@CurrentUser("id") userId: string): Promise<UserProfileDto> {
    return this.authService.getCurrentUserProfile(userId);
  }

  @Patch("me")
  @UseGuards(SessionAuthGuard)
  @ApiCookieAuth("better-auth.session_token")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user profile" })
  @ApiResponse({ status: 200, description: "Updated user profile" })
  async updateCurrentUser(
    @CurrentUser("id") userId: string,
    @Body() dto: UpdateUserProfileDto
  ): Promise<UserProfileDto> {
    return this.authService.updateProfile(userId, dto);
  }

  @All("*path")
  @ApiOperation({ summary: "Better Auth engine router (sign-in, sign-up, sign-out, session, oauth)" })
  async handleAuth(@Req() req: Request, @Res() res: Response) {
    return toNodeHandler(this.authService.instance.handler)(req, res);
  }
}
