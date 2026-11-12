import { Module, Global } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { PrismaService } from "../../database/prisma.service";
import { SessionAuthGuard } from "../../common/guards/session-auth.guard";

@Global()
@Module({
  controllers: [AuthController],
  providers: [AuthService, PrismaService, SessionAuthGuard],
  exports: [AuthService, SessionAuthGuard],
})
export class AuthModule {}
