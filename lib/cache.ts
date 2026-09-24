/**
 * In-memory LRU cache with TTL for Q&A responses.
 * Prevents redundant LLM calls for repeated questions.
 *
 * Key: normalized redacted query + language
 * Value: cached answer text
 */

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const DEFAULT_MAX_SIZE = 100;
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
    // Move to end (most recently used)
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: string): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      // Evict least recently used (first entry)
      const firstKey = this.map.keys().next().value;
      if (firstKey !== undefined) {
        this.map.delete(firstKey);
      }
    }
    this.map.set(key, { value, expiresAt: Date.now() + this.ttlMs });
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
}

/** Singleton cache instance for Q&A responses */
export const qaCache = new LRUCache(100, 5 * 60 * 1000);

/**
 * Normalizes a query for use as a cache key.
 * Lowercases, trims, and collapses whitespace.
 */
export function normalizeCacheKey(query: string, language: string): string {
  const normalized = query.toLowerCase().trim().replace(/\s+/g, " ");
  return `${language}:${normalized}`;
}
