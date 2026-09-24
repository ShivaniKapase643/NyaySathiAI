/**
 * In-memory sliding-window rate limiter per IP address.
 *
 * NOTE: This in-memory implementation only works correctly in a single-process
 * deployment (e.g., a single Vercel Edge/Node instance or local dev).
 * For multi-instance production use, replace the Map with Redis/Upstash
 * using the same sliding-window algorithm.
 */

interface WindowEntry {
  timestamps: number[];
  dailyCount: number;
  dailyReset: number;
}

const store = new Map<string, WindowEntry>();

// Read limits lazily so tests can override process.env before first call
function getWindowMs(): number { return Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000); }
function getMaxRequests(): number { return Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 20); }
function getDailyCap(): number { return Number(process.env.DAILY_CAP_PER_IP ?? 200); }

function nextMidnightUTC(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: "window" | "daily";
  retryAfterMs?: number;
}

/**
 * Checks whether the given IP is within rate limits.
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const WINDOW_MS = getWindowMs();
  const MAX_REQUESTS = getMaxRequests();
  const DAILY_CAP = getDailyCap();

  let entry = store.get(ip);
  if (!entry) {
    entry = { timestamps: [], dailyCount: 0, dailyReset: nextMidnightUTC() };
    store.set(ip, entry);
  }

  if (now >= entry.dailyReset) {
    entry.dailyCount = 0;
    entry.dailyReset = nextMidnightUTC();
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < WINDOW_MS);

  if (entry.dailyCount >= DAILY_CAP) {
    return { allowed: false, reason: "daily", retryAfterMs: entry.dailyReset - now };
  }

  if (entry.timestamps.length >= MAX_REQUESTS) {
    const oldest = entry.timestamps[0];
    return { allowed: false, reason: "window", retryAfterMs: WINDOW_MS - (now - oldest) };
  }

  entry.timestamps.push(now);
  entry.dailyCount += 1;
  return { allowed: true };
}

/** Clears the rate-limit store (test helper). */
export function clearRateLimitStore(): void {
  store.clear();
}
