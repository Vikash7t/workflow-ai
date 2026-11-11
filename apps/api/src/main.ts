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
  const app = await NestFactory.create(AppModule);

  // Security Headers via Helmet
  app.use(helmet());

  // Cookie Parser for Session Authentication
  app.use(cookieParser());

  // Global Problem Details Exception Filter
  app.useGlobalFilters(new GlobalExceptionFilter());

  // CORS Configuration
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Workspace-Id"],
  });

  // Global API Prefix
  app.setGlobalPrefix("api/v1");

  // Swagger / OpenAPI Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Workflow AI API")
    .setDescription("Intelligent Project Management SaaS — Core Backend Domain")
    .setVersion("0.1.0")
    .addTag("Health", "Liveness and readiness probes")
    .addCookieAuth("better-auth.session_token")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("api/docs", app, document);

  await app.listen(env.PORT);
  logger.log(`🚀 Workflow AI API running on http://localhost:${env.PORT}/api/v1`);
  logger.log(`📚 Swagger Documentation accessible at http://localhost:${env.PORT}/api/docs`);
}

bootstrap();
