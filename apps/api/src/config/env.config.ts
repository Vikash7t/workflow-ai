import { z } from "zod";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../../apps/api/.env") });

export const DEV_DEFAULT_SECRET = "dev_better_auth_secret_minimum_32_characters_long";

export const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z
      .string()
      .min(1, "DATABASE_URL is required")
      .default("postgresql://postgres:postgres@localhost:5432/workflow_ai?schema=public"),
    ALLOWED_ORIGINS: z.string().default("http://localhost:3000"),
    BETTER_AUTH_SECRET: z.string().min(16).default(DEV_DEFAULT_SECRET),
    BETTER_AUTH_URL: z.string().default("http://localhost:4000"),
    GITHUB_CLIENT_ID: z.string().optional(),
    GITHUB_CLIENT_SECRET: z.string().optional(),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
    METRICS_BEARER_TOKEN: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (data.BETTER_AUTH_SECRET === DEV_DEFAULT_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["BETTER_AUTH_SECRET"],
          message: "BETTER_AUTH_SECRET must not use the default development secret in production",
        });
      }
      if (data.BETTER_AUTH_SECRET.length < 32) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["BETTER_AUTH_SECRET"],
          message: "BETTER_AUTH_SECRET must be at least 32 characters in production",
        });
      }
    }
  });

export type EnvConfig = z.infer<typeof EnvSchema>;

export function validateEnv(rawEnv: NodeJS.ProcessEnv = process.env): EnvConfig {
  const result = EnvSchema.safeParse(rawEnv);
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment configuration: " + JSON.stringify(result.error.format()));
  }
  return result.data;
}

export const env = validateEnv();
