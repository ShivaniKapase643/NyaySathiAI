/**
 * Exponential-backoff retry wrapper for LLM API calls.
 * Retries on transient errors (rate limits, network timeouts).
 * Uses jitter to avoid thundering herd on concurrent retries.
 * Clears the timeout handle after each attempt to prevent timer leaks.
 */

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 300;
const MAX_DELAY_MS = 8_000;
const TIMEOUT_MS = 25_000;

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function isRetryable(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (
      msg.includes("timeout") ||
      msg.includes("econnreset") ||
      msg.includes("network") ||
      msg.includes("fetch failed")
    )
      return true;
  }
  const status = (err as { status?: number })?.status;
  if (status && RETRYABLE_STATUS.has(status)) return true;
  return false;
}

/** Random jitter (0–100 ms) to prevent thundering herd. */
function withJitter(ms: number): number {
  return ms + Math.random() * 100;
}

/**
 * Races fn() against a timeout.
 * Clears the timer handle in a `finally` block so it never leaks
 * even when fn() resolves first.
 */
async function raceTimeout<T>(fn: () => Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("LLM request timed out after 25s")),
      TIMEOUT_MS
    );
  });
  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    clearTimeout(timer); // always cleared — no timer leak
  }
}

/**
 * Wraps an async operation with exponential-backoff retries, jitter, and a timeout.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await raceTimeout(fn);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && isRetryable(err)) {
        const baseDelay = BASE_DELAY_MS * Math.pow(2, attempt);
        const delay = withJitter(Math.min(baseDelay, MAX_DELAY_MS));
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      break;
    }
  }

  throw lastError;
}
