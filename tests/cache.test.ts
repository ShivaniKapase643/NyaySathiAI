/**
 * Tests for the LRU cache with TTL.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { LRUCache, normalizeCacheKey } from "@/lib/cache";

describe("LRUCache", () => {
  let cache: LRUCache;

  beforeEach(() => {
    cache = new LRUCache(3, 5000); // max 3 items, 5s TTL
  });

  it("stores and retrieves a value", () => {
    cache.set("key1", "value1");
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("missing")).toBeUndefined();
  });

  it("reports has() correctly", () => {
    cache.set("exists", "yes");
    expect(cache.has("exists")).toBe(true);
    expect(cache.has("missing")).toBe(false);
  });

  it("evicts LRU entry when at capacity", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");
    // Access 'a' to make it recently used
    cache.get("a");
    // Add 'd' — should evict 'b' (LRU)
    cache.set("d", "4");
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe("1");
    expect(cache.get("c")).toBe("3");
    expect(cache.get("d")).toBe("4");
  });

  it("expires entries after TTL", async () => {
    const shortCache = new LRUCache(10, 100); // 100ms TTL
    shortCache.set("temp", "value");
    expect(shortCache.get("temp")).toBe("value");
    await new Promise((r) => setTimeout(r, 150));
    expect(shortCache.get("temp")).toBeUndefined();
  });

  it("reports correct size", () => {
    expect(cache.size).toBe(0);
    cache.set("x", "1");
    cache.set("y", "2");
    expect(cache.size).toBe(2);
  });

  it("clears all entries", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });
});

describe("normalizeCacheKey", () => {
  it("normalizes to lowercase and trims whitespace", () => {
    const k1 = normalizeCacheKey("  HOW TO FILE RTI  ", "en");
    const k2 = normalizeCacheKey("how to file rti", "en");
    expect(k1).toBe(k2);
  });

  it("includes language in key", () => {
    const enKey = normalizeCacheKey("rtI query", "en");
    const hiKey = normalizeCacheKey("rtI query", "hi");
    expect(enKey).not.toBe(hiKey);
  });

  it("collapses multiple spaces", () => {
    const k = normalizeCacheKey("how   to  file   rti", "en");
    expect(k).toBe("en:how to file rti");
  });
});
