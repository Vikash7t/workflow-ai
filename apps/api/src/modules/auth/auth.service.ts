import { Injectable, OnModuleInit, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { createBetterAuth, AuthInstance } from "./better-auth.instance";
import { fromNodeHeaders } from "better-auth/node";
import { IncomingHttpHeaders } from "http";
import { UpdateUserProfileDto, UserProfileDto } from "@workflow-ai/contracts";

@Injectable()
export class AuthService implements OnModuleInit {
  private authInstance!: AuthInstance;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.authInstance = createBetterAuth(this.prisma);
  }

  get instance(): AuthInstance {
    return this.authInstance;
  }

  async validateSessionFromHeaders(headers: IncomingHttpHeaders) {
    const nodeHeaders = fromNodeHeaders(headers);
    const session = await this.authInstance.api.getSession({
      headers: nodeHeaders,
    });

    if (!session || !session.user) {
      return null;
    }

    return session;
  }

  async getCurrentUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException("User not found");
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateProfile(userId: string, dto: UpdateUserProfileDto): Promise<UserProfileDto> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.image !== undefined ? { image: dto.image } : {}),
      },
    });

    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      image: updated.image,
      createdAt: updated.createdAt.toISOString(),
    };
  }
}
