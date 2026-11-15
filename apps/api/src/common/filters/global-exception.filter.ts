import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ProblemDetails } from "@workflow-ai/contracts";
import { env } from "../../config/env.config";
import * as crypto from "crypto";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  private readonly isProduction: boolean;

  constructor(isProduction?: boolean) {
    this.isProduction = isProduction !== undefined ? isProduction : env.NODE_ENV === "production";
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId =
      (request.headers["x-request-id"] as string) ||
      crypto.randomUUID();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let title = "Internal Server Error";
    let detail = "An unexpected internal server error occurred.";
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      title = exception.name;

      if (typeof res === "string") {
        detail = res;
      } else if (typeof res === "object" && res !== null) {
        const resObj = res as Record<string, any>;
        detail = resObj.message || exception.message;
        if (Array.isArray(resObj.message)) {
          errors = { validation: resObj.message };
        }
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled Exception [RequestID: ${requestId}]: ${exception.message}`,
        exception.stack
      );

      // In production, mask internal error details to prevent connection strings or SQL leakage
      if (this.isProduction) {
        detail = "An unexpected internal server error occurred.";
      } else {
        detail = exception.message;
      }
    } else {
      this.logger.error(`Unknown exception type caught: ${String(exception)}`);
    }

    const problem: ProblemDetails = {
      type: `https://api.workflow-ai.com/errors/${status}`,
      title,
      status,
      detail,
      instance: request.url,
      timestamp: new Date().toISOString(),
      ...(errors ? { errors } : {}),
    };

    // Attach incident correlation ID header
    response.setHeader("X-Request-Id", requestId);
    response.status(status).json(problem);
  }
}
