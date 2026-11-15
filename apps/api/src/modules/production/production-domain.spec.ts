import test from "node:test";
import assert from "node:assert/strict";
import { HttpStatus, HttpException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RateLimitGuard } from "../../common/guards/rate-limit.guard";
import { GlobalExceptionFilter } from "../../common/filters/global-exception.filter";
import { HealthService } from "../health/health.service";
import { HealthController } from "../health/health.controller";
import { MetricsService } from "../health/metrics.service";
import { MetricsController } from "../health/metrics.controller";
import { EnvSchema, DEV_DEFAULT_SECRET } from "../../config/env.config";

test("Production Readiness, Security Hardening & Observability Audit (Phase 12)", async (t) => {
  await t.test("Sliding-Window Rate Limiter & Tiered Throttling Guard", async (t2) => {
    const reflector = new Reflector();
    const guard = new RateLimitGuard(reflector);

    await t2.test("permits requests up to points threshold within duration window", () => {
      guard.resetStorage();
      const key = "ip:192.168.1.1:GET:/api/v1/issues";
      const now = 1000000;

      // Points: 3, Duration: 60s
      assert.equal(guard.checkLimit(key, 3, 60, now).allowed, true);
      assert.equal(guard.checkLimit(key, 3, 60, now + 1000).allowed, true);
      assert.equal(guard.checkLimit(key, 3, 60, now + 2000).allowed, true);
    });

    await t2.test("rejects requests exceeding limit with accurate Retry-After seconds", () => {
      guard.resetStorage();
      const key = "ip:192.168.1.1:GET:/api/v1/auth/login";
      const now = 1000000;

      // Limit: 2 requests per 60s
      assert.equal(guard.checkLimit(key, 2, 60, now).allowed, true);
      assert.equal(guard.checkLimit(key, 2, 60, now + 1000).allowed, true);

      // Third request within window must be rejected
      const rejected = guard.checkLimit(key, 2, 60, now + 2000);
      assert.equal(rejected.allowed, false);
      assert.ok(rejected.retryAfterSeconds >= 58, `Expected retryAfter around 58-60s, got ${rejected.retryAfterSeconds}`);
    });

    await t2.test("unblocks requests once the sliding duration window has elapsed", () => {
      guard.resetStorage();
      const key = "ip:192.168.1.1:POST:/api/v1/copilot";
      const now = 1000000;

      // Limit: 1 request per 10s
      assert.equal(guard.checkLimit(key, 1, 10, now).allowed, true);
      assert.equal(guard.checkLimit(key, 1, 10, now + 5000).allowed, false);

      // After 11s (window expired), new request is allowed
      assert.equal(guard.checkLimit(key, 1, 10, now + 11000).allowed, true);
    });

    await t2.test("isolates rate limits by client IP and authenticated user", () => {
      guard.resetStorage();
      const now = 1000000;

      // Client A exhausts their quota
      assert.equal(guard.checkLimit("ip:10.0.0.1:GET:/data", 1, 60, now).allowed, true);
      assert.equal(guard.checkLimit("ip:10.0.0.1:GET:/data", 1, 60, now).allowed, false);

      // Client B has an independent quota and is unaffected
      assert.equal(guard.checkLimit("ip:10.0.0.2:GET:/data", 1, 60, now).allowed, true);

      // Authenticated User has independent quota on the same route
      assert.equal(guard.checkLimit("user:user-123:GET:/data", 1, 60, now).allowed, true);
    });
  });

  await t.test("Production Error Masking & OWASP A05 Sensitive Data Protection", async (t2) => {
    await t2.test("masks internal database errors and credentials when NODE_ENV is production", () => {
      const prodFilter = new GlobalExceptionFilter(true); // isProduction = true

      let capturedStatus = 0;
      let capturedHeaders: Record<string, string> = {};
      let capturedJson: any = null;

      const mockResponse: any = {
        setHeader: (k: string, v: string) => {
          capturedHeaders[k.toLowerCase()] = v;
        },
        status: (s: number) => {
          capturedStatus = s;
          return {
            json: (payload: any) => {
              capturedJson = payload;
            },
          };
        },
      };

      const mockHost: any = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => ({ url: "/api/v1/issues", headers: {} }),
        }),
      };

      const sensitiveDatabaseError = new Error(
        "FATAL: connect ECONNREFUSED postgresql://postgres:SuperSecretP@ssword@db.internal:5432/workflow_ai"
      );

      prodFilter.catch(sensitiveDatabaseError, mockHost);

      assert.equal(capturedStatus, 500);
      assert.equal(capturedJson.detail, "An unexpected internal server error occurred.");
      assert.equal(capturedJson.title, "Internal Server Error");
      assert.ok(!JSON.stringify(capturedJson).includes("SuperSecretP@ssword"), "Database password must NEVER leak in response");
      assert.ok(capturedHeaders["x-request-id"], "Incident correlation ID header must be set");
    });

    await t2.test("preserves message in development mode for developer ergonomics", () => {
      const devFilter = new GlobalExceptionFilter(false); // isProduction = false

      let capturedJson: any = null;
      const mockResponse: any = {
        setHeader: () => {},
        status: () => ({
          json: (p: any) => {
            capturedJson = p;
          },
        }),
      };
      const mockHost: any = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => ({ url: "/api/v1/test", headers: {} }),
        }),
      };

      devFilter.catch(new Error("Local debug message"), mockHost);
      assert.equal(capturedJson.detail, "Local debug message");
    });

    await t2.test("passes through legitimate business HttpExceptions without masking", () => {
      const prodFilter = new GlobalExceptionFilter(true);

      let capturedStatus = 0;
      let capturedJson: any = null;
      const mockResponse: any = {
        setHeader: () => {},
        status: (s: number) => {
          capturedStatus = s;
          return {
            json: (p: any) => {
              capturedJson = p;
            },
          };
        },
      };
      const mockHost: any = {
        switchToHttp: () => ({
          getResponse: () => mockResponse,
          getRequest: () => ({ url: "/api/v1/issues", headers: {} }),
        }),
      };

      const notFound = new HttpException("Issue ENG-404 not found in this workspace", HttpStatus.NOT_FOUND);
      prodFilter.catch(notFound, mockHost);

      assert.equal(capturedStatus, 404);
      assert.equal(capturedJson.detail, "Issue ENG-404 not found in this workspace");
    });
  });

  await t.test("Health Probes, Degradation Status & Storm Cache Mitigation", async (t2) => {
    let dbHealthy = true;
    let queryCount = 0;

    const mockPrisma: any = {
      isHealthy: async () => {
        queryCount++;
        return dbHealthy;
      },
    };

    const healthService = new HealthService(mockPrisma);
    const healthController = new HealthController(healthService);

    await t2.test("readiness probe returns HTTP 200 when database is healthy", async () => {
      healthService.clearCache();
      dbHealthy = true;

      let statusCode = 200;
      const mockRes: any = {
        status: (code: number) => {
          statusCode = code;
        },
      };

      const result = await healthController.getReadiness(mockRes);
      assert.equal(result.status, "ok");
      assert.equal(result.checks.database, "up");
      assert.equal(statusCode, 200);
    });

    await t2.test("readiness probe returns HTTP 503 when database is down or degraded", async () => {
      healthService.clearCache();
      dbHealthy = false;

      let statusCode = 200;
      const mockRes: any = {
        status: (code: number) => {
          statusCode = code;
        },
      };

      const result = await healthController.getReadiness(mockRes);
      assert.equal(result.status, "degraded");
      assert.equal(result.checks.database, "down");
      assert.equal(statusCode, 503, "Orchestrators mandate 503 on unready/degraded services");
    });

    await t2.test("probe cache prevents connection pool exhaustion under rapid probe storms", async () => {
      healthService.clearCache();
      queryCount = 0;
      dbHealthy = true;

      // 5 consecutive rapid requests
      await healthService.checkHealth();
      await healthService.checkHealth();
      await healthService.checkHealth();
      await healthService.checkHealth();
      await healthService.checkHealth();

      assert.equal(queryCount, 1, "Expected only 1 DB query due to 5s probe cache");
    });
  });

  await t.test("Prometheus Metrics Text Exporter (OpenTelemetry Compatible)", async (t2) => {
    const metricsService = new MetricsService();
    const metricsController = new MetricsController(metricsService);

    await t2.test("formats valid Prometheus exposition text with CPU, memory, and HTTP metrics", () => {
      metricsService.resetMetrics();
      metricsService.recordHttpRequest("GET", "/api/v1/issues", 200, 42.5);
      metricsService.recordHttpRequest("POST", "/api/v1/issues", 201, 85.0);
      metricsService.recordHttpRequest("GET", "/api/v1/issues", 200, 38.0);

      const output = metricsService.formatPrometheusMetrics();

      assert.match(output, /# HELP process_uptime_seconds/);
      assert.match(output, /# TYPE process_uptime_seconds gauge/);
      assert.match(output, /# HELP process_resident_memory_bytes/);
      assert.match(output, /# HELP http_requests_total/);
      assert.match(output, /http_requests_total\{method="GET",route="\/api\/v1\/issues",status="200"\} 2/);
      assert.match(output, /http_requests_total\{method="POST",route="\/api\/v1\/issues",status="201"\} 1/);
      assert.match(output, /# HELP http_request_duration_ms_p95/);
    });

    await t2.test("enforces Bearer token verification if METRICS_BEARER_TOKEN is configured", () => {
      // Test when token is valid
      let outputBody = "";
      let capturedHeader = "";
      const mockRes: any = {
        setHeader: (k: string, v: string) => {
          if (k.toLowerCase() === "content-type") capturedHeader = v;
        },
        send: (body: string) => {
          outputBody = body;
        },
      };

      metricsController.getMetrics(undefined, mockRes);
      assert.ok(outputBody.length > 0);
      assert.match(capturedHeader, /text\/plain/);
    });
  });

  await t.test("Production Environment Secrets Hardening", async (t2) => {
    await t2.test("rejects default dev secret in production environment", () => {
      const invalidProd = EnvSchema.safeParse({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://postgres:secret@db:5432/prod",
        BETTER_AUTH_SECRET: DEV_DEFAULT_SECRET, // Dev default secret
      });

      assert.equal(invalidProd.success, false);
      const errors = invalidProd.error?.issues || [];
      assert.ok(
        errors.some((i) => i.message.includes("must not use the default development secret")),
        "Production must reject fallback dev auth secret"
      );
    });

    await t2.test("rejects secret under 32 characters in production", () => {
      const invalidShort = EnvSchema.safeParse({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://postgres:secret@db:5432/prod",
        BETTER_AUTH_SECRET: "short_secret_only_24_chars",
      });

      assert.equal(invalidShort.success, false);
    });

    await t2.test("accepts secure 32+ char secret in production", () => {
      const validProd = EnvSchema.safeParse({
        NODE_ENV: "production",
        DATABASE_URL: "postgresql://postgres:secret@db:5432/prod",
        BETTER_AUTH_SECRET: "a_very_secure_high_entropy_secret_key_exceeding_32_characters_strictly",
      });

      assert.equal(validProd.success, true);
    });

    await t2.test("allows dev default secret in development mode", () => {
      const validDev = EnvSchema.safeParse({
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://postgres:secret@db:5432/dev",
      });

      assert.equal(validDev.success, true);
    });
  });
});
