import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request, Response } from "express";
import {
  RateLimitOptions,
  RATE_LIMIT_METADATA_KEY,
} from "../decorators/rate-limit.decorator";

interface RateLimitBucket {
  timestamps: number[];
}

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  private readonly storage = new Map<string, RateLimitBucket>();
  private lastCleanup = Date.now();

  // Default global limits: 120 requests per 60 seconds
  private readonly defaultOptions: RateLimitOptions = {
    points: 120,
    durationSeconds: 60,
  };

  constructor(private readonly reflector: Reflector) {}

  /**
   * Cleans stale entries older than 5 minutes to avoid memory leaks.
   */
  public cleanStaleEntries(): void {
    const now = Date.now();
    const cutoff = now - 5 * 60 * 1000;
    for (const [key, bucket] of this.storage.entries()) {
      bucket.timestamps = bucket.timestamps.filter((ts) => ts > cutoff);
      if (bucket.timestamps.length === 0) {
        this.storage.delete(key);
      }
    }
    this.lastCleanup = now;
  }

  /**
   * Resets all in-memory buckets (useful for test isolation).
   */
  public resetStorage(): void {
    this.storage.clear();
  }

  /**
   * Core rate limiting calculation using sliding-window logs.
   * Returns { allowed: boolean, retryAfterSeconds: number, remaining: number }.
   */
  public checkLimit(
    key: string,
    points: number,
    durationSeconds: number,
    now: number = Date.now()
  ): { allowed: boolean; retryAfterSeconds: number; remaining: number } {
    if (now - this.lastCleanup > 60 * 1000) {
      this.cleanStaleEntries();
    }

    const windowMs = durationSeconds * 1000;
    const windowStart = now - windowMs;

    let bucket = this.storage.get(key);
    if (!bucket) {
      bucket = { timestamps: [] };
      this.storage.set(key, bucket);
    }

    // Filter out timestamps older than the active sliding window
    bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

    if (bucket.timestamps.length >= points) {
      const oldestInWindow = bucket.timestamps[0];
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((oldestInWindow + windowMs - now) / 1000)
      );
      return { allowed: false, retryAfterSeconds, remaining: 0 };
    }

    bucket.timestamps.push(now);
    const remaining = points - bucket.timestamps.length;
    return { allowed: true, retryAfterSeconds: 0, remaining };
  }

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Read custom route options or fallback to default
    const options =
      this.reflector.getAllAndOverride<RateLimitOptions>(
        RATE_LIMIT_METADATA_KEY,
        [handler, classRef]
      ) || this.defaultOptions;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Derive client identity: prioritize authenticated userId, otherwise verified IP
    const user = (request as any).user;
    const clientIp =
      (request.ips && request.ips.length > 0 ? request.ips[0] : request.ip) ||
      "127.0.0.1";

    const path = request.route?.path || request.path;
    const routeIdentifier = `${request.method}:${path}`;
    const clientKey = user?.id
      ? `user:${user.id}:${routeIdentifier}`
      : `ip:${clientIp}:${routeIdentifier}`;

    const result = this.checkLimit(
      clientKey,
      options.points,
      options.durationSeconds
    );

    if (response && typeof response.setHeader === "function") {
      response.setHeader("X-RateLimit-Limit", options.points.toString());
      response.setHeader("X-RateLimit-Remaining", result.remaining.toString());
    }

    if (!result.allowed) {
      if (response && typeof response.setHeader === "function") {
        response.setHeader(
          "Retry-After",
          result.retryAfterSeconds.toString()
        );
      }
      this.logger.warn(
        `Rate limit exceeded for ${clientKey}. Limit: ${options.points}/${options.durationSeconds}s. Retry-After: ${result.retryAfterSeconds}s`
      );
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests. Please wait ${result.retryAfterSeconds} second(s) before retrying.`,
          retryAfter: result.retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    return true;
  }
}
