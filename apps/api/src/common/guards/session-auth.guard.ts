import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "../../modules/auth/auth.service";

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session = await this.authService.validateSessionFromHeaders(request.headers);

    if (!session || !session.user) {
      throw new UnauthorizedException("Authentication session required or expired");
    }

    request.user = session.user;
    request.session = session.session;
    return true;
  }
}
