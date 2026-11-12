import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { OrganizationsService } from "./organizations.service";
import { WorkspacesController } from "./workspaces.controller";
import { WorkspacesService } from "./workspaces.service";
import { MembersController } from "./members.controller";
import { MembersService } from "./members.service";
import { PrismaService } from "../../database/prisma.service";
import { WorkspaceAccessGuard } from "../../common/guards/workspace-access.guard";
import { RolesGuard } from "../../common/guards/roles.guard";

@Module({
  controllers: [OrganizationsController, WorkspacesController, MembersController],
  providers: [
    OrganizationsService,
    WorkspacesService,
    MembersService,
    PrismaService,
    WorkspaceAccessGuard,
    RolesGuard,
  ],
  exports: [OrganizationsService, WorkspacesService, MembersService],
})
export class TenancyModule {}
