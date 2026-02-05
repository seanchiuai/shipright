/**
 * Retry utilities with exponential backoff
 *
 * Use for external API calls (GitHub, Daytona) that may fail due to
 * rate limits, transient errors, or eventual consistency.
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableStatuses: number[];
  retryableErrors: string[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  retryableErrors: ["ETIMEDOUT", "ECONNRESET", "ENOTFOUND", "ECONNREFUSED"],
};

// GitHub needs more aggressive retries for eventual consistency
export const GITHUB_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxAttempts: 5,
  initialDelayMs: 2000,
  retryableStatuses: [...DEFAULT_RETRY_CONFIG.retryableStatuses, 404], // 404 can be eventual consistency
};

// Daytona sandbox operations
export const DAYTONA_RETRY_CONFIG: RetryConfig = {
  ...DEFAULT_RETRY_CONFIG,
  maxAttempts: 3,
  initialDelayMs: 3000,
};

export class RetryExhaustedError extends Error {
  constructor(
    message: string,
    public readonly attempts: number,
    public readonly lastError: Error,
    public readonly context?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "RetryExhaustedError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown, config: RetryConfig): boolean {
  // Check HTTP status
  if (typeof error === "object" && error !== null) {
    const statusError = error as { status?: number; response?: { status?: number } };
    const status = statusError.status || statusError.response?.status;
    if (status && config.retryableStatuses.includes(status)) {
      return true;
    }

    // Check error codes
    const codeError = error as { code?: string };
    if (codeError.code && config.retryableErrors.includes(codeError.code)) {
      return true;
    }
  }

  return false;
}

/**
 * Execute an operation with retry and exponential backoff.
 *
 * @example
 * const result = await withRetry(
 *   () => octokit.rest.git.createTree(params),
 *   GITHUB_RETRY_CONFIG,
 *   { operation: 'createTree', repo: 'owner/repo' }
 * );
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  context: { operation: string; [key: string]: unknown } = { operation: "unknown" },
): Promise<T> {
  let lastError: Error | undefined;
  let delay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      const shouldRetry = isRetryable(error, config);
      const isLastAttempt = attempt === config.maxAttempts;

      console.log(
        JSON.stringify({
          level: shouldRetry && !isLastAttempt ? "warn" : "error",
          action: context.operation,
          attempt,
          maxAttempts: config.maxAttempts,
          error: lastError.message,
          willRetry: shouldRetry && !isLastAttempt,
          nextDelayMs: shouldRetry && !isLastAttempt ? delay : undefined,
          ...context,
        }),
      );

      if (!shouldRetry || isLastAttempt) {
        throw new RetryExhaustedError(
          `${context.operation} failed after ${attempt} attempt(s): ${lastError.message}`,
          attempt,
          lastError,
          context,
        );
      }

      await sleep(delay);
      delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
    }
  }

  // Should never reach here
  throw lastError;
}

