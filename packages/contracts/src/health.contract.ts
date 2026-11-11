import { z } from "zod";

export const HealthStatusSchema = z.object({
  status: z.enum(["ok", "error", "degraded"]),
  service: z.string(),
  version: z.string(),
  uptimeSeconds: z.number(),
  timestamp: z.string(),
  checks: z.object({
    database: z.enum(["up", "down", "not_configured"]),
  }),
});

export type HealthStatusDto = z.infer<typeof HealthStatusSchema>;
