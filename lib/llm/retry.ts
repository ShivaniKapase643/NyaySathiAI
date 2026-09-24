/**
 * Exponential-backoff retry wrapper for LLM API calls.
 * Retries on transient errors (rate limits, network timeouts).
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const TIMEOUT_MS = 25_000;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes("timeout") || msg.includes("econnreset")) return true;
  }
  const status = (err as { status?: number })?.status;
  if (status && RETRYABLE_STATUS.has(status)) return true;
  return false;
}

/**
 * Wraps an async operation with exponential-backoff retries and a global timeout.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("LLM request timed out")), TIMEOUT_MS)
      );
      return await Promise.race([fn(), timeoutPromise]);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && isRetryable(err)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }

  throw lastError;
}
