import { SetMetadata } from "@nestjs/common";

export interface RateLimitOptions {
  /** Maximum number of requests permitted within duration */
  points: number;
  /** Window duration in seconds */
  durationSeconds: number;
}

export const RATE_LIMIT_METADATA_KEY = "RATE_LIMIT_OPTIONS";

/**
 * Decorator to apply custom rate limits to a controller or individual route handler.
 * Example: @RateLimit({ points: 5, durationSeconds: 60 })
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, options);
