/**
 * In-memory LRU cache with TTL.
 * Prevents redundant LLM calls for repeated questions and simplifications.
 *
 * Key: normalized redacted query + language
 * Value: cached response text
 *
 * NOTE: In-memory only — resets on cold start. For persistent caching across
 * Vercel instances, replace with Upstash Redis using the same interface.
 */

interface CacheEntry {
  value: string;
  expiresAt: number;
  hits: number;
}

const DEFAULT_MAX_SIZE = 200;
const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 minutes (increased from 5)

export class LRUCache {
  private map: Map<string, CacheEntry>;
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize = DEFAULT_MAX_SIZE, ttlMs = DEFAULT_TTL_MS) {
    this.map = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): string | undefined {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return undefined;
    }
    // Move to end (most recently used) and track hits
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
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }
    this.map.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
      hits: 0,
    });
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  /** Evicts all expired entries proactively (call periodically to free memory). */
  evictExpired(): number {
    const now = Date.now();
    let evicted = 0;
    for (const [key, entry] of Array.from(this.map.entries())) {
      if (now > entry.expiresAt) {
        this.map.delete(key);
        evicted++;
      }
    }
    return evicted;
  }
}

/** Singleton Q&A cache — 200 entries, 15 min TTL */
export const qaCache = new LRUCache(200, 15 * 60 * 1000);

/** Singleton simplify cache — 50 entries, 10 min TTL */
export const simplifyCache = new LRUCache(50, 10 * 60 * 1000);

/**
 * Normalizes a query string for use as a cache key.
 * Lowercases, trims, and collapses whitespace to maximise cache hit rate.
 */
export function normalizeCacheKey(query: string, language: string): string {
  const normalized = query
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?!.,]+$/g, ""); // strip trailing punctuation
  return `${language}:${normalized}`;
}
