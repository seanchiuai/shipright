/**
 * Structured Error Types
 *
 * Consistent error handling with user-friendly messages and rich context.
 */

/**
 * Base error class for all Shipright errors.
 * Includes context for debugging and optional user-friendly message.
 */
export class ShiprightError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context: Record<string, unknown> = {},
    public readonly userMessage?: string,
    public readonly recoverable: boolean = false,
  ) {
    super(message);
    this.name = "ShiprightError";
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      userMessage: this.userMessage,
      recoverable: this.recoverable,
    };
  }
}

/**
 * Authentication or authorization failures.
 */
export class AuthenticationError extends ShiprightError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(
      message,
      "AUTH_ERROR",
      context,
      "Unable to authenticate. Please reconnect your GitHub account.",
      true,
    );
    this.name = "AuthenticationError";
  }
}

/**
 * External service failures (GitHub, Daytona, Anthropic).
 */
export class ExternalServiceError extends ShiprightError {
  constructor(
    service: "github" | "daytona" | "anthropic",
    message: string,
    context: Record<string, unknown> = {},
  ) {
    const userMessages: Record<string, string> = {
      github: "We're having trouble connecting to GitHub. Please try again in a few minutes.",
      daytona: "Our build environment is temporarily unavailable. Please try again shortly.",
      anthropic: "AI service is temporarily unavailable. Please try again in a few minutes.",
    };

    super(
      `${service} error: ${message}`,
      `${service.toUpperCase()}_ERROR`,
      { service, ...context },
      userMessages[service],
      true,
    );
    this.name = "ExternalServiceError";
  }
}

/**
 * Pipeline step failures with step context.
 */
export class PipelineError extends ShiprightError {
  constructor(
    step: string,
    message: string,
    context: Record<string, unknown> = {},
  ) {
    super(
      `Pipeline step '${step}' failed: ${message}`,
      "PIPELINE_ERROR",
      { step, ...context },
      "Something went wrong during project setup. You can try again or contact support.",
      true,
    );
    this.name = "PipelineError";
  }
}

/**
 * Validation failures (user input, data integrity).
 */
export class ValidationError extends ShiprightError {
  constructor(message: string, context: Record<string, unknown> = {}) {
    super(message, "VALIDATION_ERROR", context, message, true);
    this.name = "ValidationError";
  }
}

/**
 * Resource not found errors.
 */
export class NotFoundError extends ShiprightError {
  constructor(resource: string, id: string, context: Record<string, unknown> = {}) {
    super(
      `${resource} not found: ${id}`,
      "NOT_FOUND",
      { resource, id, ...context },
      `The requested ${resource.toLowerCase()} could not be found.`,
      false,
    );
    this.name = "NotFoundError";
  }
}

/**
 * Timeout errors for long-running operations.
 */
export class TimeoutError extends ShiprightError {
  constructor(operation: string, timeoutMs: number, context: Record<string, unknown> = {}) {
    super(
      `${operation} timed out after ${timeoutMs}ms`,
      "TIMEOUT",
      { operation, timeoutMs, ...context },
      "The operation took too long. Please try again.",
      true,
    );
    this.name = "TimeoutError";
  }
}

/**
 * Extract user-friendly message from any error.
 */
export function getUserMessage(error: unknown): string {
  if (error instanceof ShiprightError && error.userMessage) {
    return error.userMessage;
  }
  if (error instanceof Error) {
    // Don't expose internal error messages to users
    return "An unexpected error occurred. Please try again.";
  }
  return "An unexpected error occurred.";
}

/**
 * Extract error code from any error.
 */
export function getErrorCode(error: unknown): string {
  if (error instanceof ShiprightError) {
    return error.code;
  }
  return "UNKNOWN_ERROR";
}

/**
 * Check if an error is recoverable (user can retry).
 */
export function isRecoverable(error: unknown): boolean {
  if (error instanceof ShiprightError) {
    return error.recoverable;
  }
  return false;
}

/**
 * Wrap an unknown error into a ShiprightError with context.
 */
export function wrapError(
  error: unknown,
  step: string,
  context: Record<string, unknown> = {},
): ShiprightError {
  if (error instanceof ShiprightError) {
    // Already wrapped, add context
    return new ShiprightError(
      error.message,
      error.code,
      { ...error.context, ...context },
      error.userMessage,
      error.recoverable,
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  return new PipelineError(step, message, context);
}
