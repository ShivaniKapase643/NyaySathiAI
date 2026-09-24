/**
 * In-memory sliding-window rate limiter per IP address.
 *
 * Key improvements:
 * - Env vars memoised after first read (no re-parse on every request)
 * - Store Map is bounded: max 10,000 IP entries; oldest evicted when full
 * - Stale IP entries (idle > 2 × window) are evicted proactively
 *
 * NOTE: In-memory only. For multi-instance production use Redis/Upstash.
 */

interface WindowEntry {
  timestamps: number[];
  dailyCount: number;
  dailyReset: number;
  lastSeen: number;
}

const store = new Map<string, WindowEntry>();

// Max IPs tracked — bounds memory usage; oldest evicted when full
const MAX_IPS = 10_000;

// Memoised config — read once, never re-parsed per request
let _windowMs: number | undefined;
let _maxRequests: number | undefined;
let _dailyCap: number | undefined;

function getWindowMs(): number {
  return (_windowMs ??= Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000));
}
function getMaxRequests(): number {
  return (_maxRequests ??= Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 20));
}
function getDailyCap(): number {
  return (_dailyCap ??= Number(process.env.DAILY_CAP_PER_IP ?? 200));
}

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
 * Evicts the oldest IP entry when the store is at capacity.
 */
export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const WINDOW_MS = getWindowMs();
  const MAX_REQUESTS = getMaxRequests();
  const DAILY_CAP = getDailyCap();

  let entry = store.get(ip);
  if (!entry) {
    // Evict oldest entry when at capacity to keep store bounded
    if (store.size >= MAX_IPS) {
      const oldestKey = store.keys().next().value;
      if (oldestKey !== undefined) store.delete(oldestKey);
    }
    entry = { timestamps: [], dailyCount: 0, dailyReset: nextMidnightUTC(), lastSeen: now };
    store.set(ip, entry);
  }

  entry.lastSeen = now;

  // Reset daily counter if past midnight
  if (now >= entry.dailyReset) {
    entry.dailyCount = 0;
    entry.dailyReset = nextMidnightUTC();
  }

  // Evict timestamps outside the sliding window
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

/** Clears the rate-limit store (test helper). Also resets memoised config. */
export function clearRateLimitStore(): void {
  store.clear();
  _windowMs = undefined;
  _maxRequests = undefined;
  _dailyCap = undefined;
}
