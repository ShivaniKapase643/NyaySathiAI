/**
 * In-memory LRU cache with TTL, periodic eviction, and in-flight deduplication.
 *
 * In-flight deduplication: identical concurrent requests share ONE LLM call.
 * When two requests arrive with the same cache key before the first resolves,
 * the second waits for the first's Promise rather than firing a duplicate LLM call.
 *
 * NOTE: In-memory only — resets on cold start. For multi-instance production
 * replace with Upstash Redis using the same interface.
 */

interface CacheEntry {
  value: string;
  expiresAt: number;
  hits: number;
}

const DEFAULT_MAX_SIZE = 200;
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes

export class LRUCache {
  private readonly map: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly ttlMs: number;
  /** In-flight: key → Promise<string> for deduplication of concurrent identical requests */
  private readonly inFlight: Map<string, Promise<string>>;
  private evictTimer: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize = DEFAULT_MAX_SIZE, ttlMs = DEFAULT_TTL_MS) {
    this.map = new Map();
    this.inFlight = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    // Schedule periodic eviction every 5 minutes so expired entries don't accumulate
    if (typeof setInterval !== "undefined") {
      this.evictTimer = setInterval(() => this.evictExpired(), 5 * 60 * 1000);
      // Allow process to exit even if timer is active
      if (this.evictTimer.unref) this.evictTimer.unref();
    }
  }

  get(key: string): string | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    // LRU: move to end (most recently used)
    this.map.delete(key);
    entry.hits += 1;
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: string): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict least recently used (first entry in insertion order)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) this.map.delete(firstKey);
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs, hits: 0 });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.map.clear();
    this.inFlight.clear();
  }

  get size(): number {
    return this.map.size;
  }

  /**
   * In-flight deduplication: if a request for `key` is already in progress,
   * return the same Promise so only ONE LLM call is made for N concurrent identical queries.
   * Call `resolve(value)` when the LLM finishes; the result is cached and all waiters receive it.
   */
  getOrSetInFlight(
    key: string,
    producer: () => Promise<string>
  ): Promise<string> {
    // Cache hit — resolve immediately
    const cached = this.get(key);
    if (cached !== undefined) return Promise.resolve(cached);

    // In-flight hit — share the existing Promise
    const existing = this.inFlight.get(key);
    if (existing) return existing;

    // New request — start producer, register in-flight, cache on completion
    const promise = producer().then(
      (value) => {
        this.set(key, value);
        this.inFlight.delete(key);
        return value;
      },
      (err: unknown) => {
        this.inFlight.delete(key);
        throw err;
      }
    );
    this.inFlight.set(key, promise);
    return promise;
  }

  /** Evicts all expired entries proactively. Called automatically every 5 min. */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    // Iterate Map directly — no Array.from() allocation
    for (const [key, entry] of this.map) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
        evicted++;
      }
    }
    return evicted;
  }

  destroy(): void {
    if (this.evictTimer) clearInterval(this.evictTimer);
  }
}

/** Singleton Q&A cache — 200 entries, 15 min TTL */
export const qaCache = new LRUCache(200, 15 * 60 * 1000);

/** Singleton simplify cache — 50 entries, 10 min TTL */
export const simplifyCache = new LRUCache(50, 10 * 60 * 1000);

/**
 * Normalizes a query for use as a cache key.
 * Lowercases, trims, collapses whitespace, strips trailing punctuation.
 */
export function normalizeCacheKey(query: string, language: string): string {
  const normalized = query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?!.,]+$/g, "");
  return `${language}:${normalized}`;
}
