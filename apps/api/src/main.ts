import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { Logger } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";
import { env } from "./config/env.config";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // 1. Enable Shutdown Hooks for graceful container termination (SIGTERM/SIGINT)
  app.enableShutdownHooks();

  // 2. Trust first reverse proxy (Cloudflare/ALB/Nginx) for accurate IP determination
  app.getHttpAdapter().getInstance().set("trust proxy", 1);

  // 3. Security Headers via Hardened Helmet
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: "deny" },
    })
  );

  // 4. Cookie Parser for Session Authentication
  app.use(cookieParser());

  // 5. Global Problem Details Exception Filter (with production error masking)
  app.useGlobalFilters(new GlobalExceptionFilter());

  // 6. CORS Configuration
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Workspace-Id", "X-Request-Id"],
    exposedHeaders: ["X-RateLimit-Limit", "X-RateLimit-Remaining", "Retry-After", "X-Request-Id"],
  });

  // 7. Global API Prefix
  app.setGlobalPrefix("api/v1");

  // 8. Swagger / OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Workflow AI API")
    .setDescription("Intelligent Project Management SaaS — Core Backend Domain")
    .setVersion("0.1.0")
    .addTag("Health", "Liveness and readiness probes")
    .addTag("Observability", "Prometheus metrics")
    .addCookieAuth("better-auth.session_token")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(env.PORT);
  logger.log(`🚀 Workflow AI API running on http://localhost:${env.PORT}/api/v1`);
  logger.log(`📚 Swagger Documentation accessible at http://localhost:${env.PORT}/api/docs`);
}

bootstrap();
