/**
 * Tests for the BM25 implementation.
 */
import { describe, it, expect } from "vitest";
import { BM25Index, tokenize } from "@/lib/rag/bm25";

const DOCS = [
  { id: "1", terms: tokenize("Right to information act RTI application filing process India"), metadata: { title: "RTI Guide" } },
  { id: "2", terms: tokenize("consumer complaint filing consumer court defective goods services"), metadata: { title: "Consumer Help" } },
  { id: "3", terms: tokenize("tenant rights security deposit landlord eviction rent control"), metadata: { title: "Tenant Rights" } },
  { id: "4", terms: tokenize("divorce Hindu marriage act mutual consent separation"), metadata: { title: "Divorce Law" } },
  { id: "5", terms: tokenize("police FIR filing cognizable offence arrested rights"), metadata: { title: "Police Rights" } },
];

describe("BM25Index", () => {
  it("returns results sorted by relevance", () => {
    const idx = new BM25Index(DOCS);
    const results = idx.search("RTI application");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].id).toBe("1");
  });

  it("returns empty array for no matching query", () => {
    const idx = new BM25Index(DOCS);
    const results = idx.search("zzzzunmatchable99999");
    expect(results).toHaveLength(0);
  });

  it("limits results to k", () => {
    const idx = new BM25Index(DOCS);
    const results = idx.search("India law rights", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("gives higher score to exact matches", () => {
    const idx = new BM25Index(DOCS);
    const results = idx.search("consumer complaint filing");
    const consumerResult = results.find((r) => r.id === "2");
    const rtiResult = results.find((r) => r.id === "1");
    if (consumerResult && rtiResult) {
      expect(consumerResult.score).toBeGreaterThan(rtiResult.score);
    }
  });

  it("handles single-word query", () => {
    const idx = new BM25Index(DOCS);
    const results = idx.search("divorce");
    expect(results.length).toBeGreaterThan(0);
  });

  it("handles empty query gracefully", () => {
    const idx = new BM25Index(DOCS);
    const results = idx.search("");
    expect(results).toHaveLength(0);
  });

  it("returns scores > 0 for matching documents", () => {
    const idx = new BM25Index(DOCS);
    const results = idx.search("tenant rights");
    expect(results.every((r) => r.score > 0)).toBe(true);
  });

  it("works on an empty document set", () => {
    const idx = new BM25Index([]);
    expect(idx.search("anything")).toHaveLength(0);
  });
});

describe("tokenize", () => {
  it("lowercases input", () => {
    expect(tokenize("HELLO WORLD")).toContain("hello");
    expect(tokenize("HELLO WORLD")).toContain("world");
  });

  it("removes punctuation", () => {
    const tokens = tokenize("Hello, World! How are you?");
    expect(tokens).not.toContain(",");
    expect(tokens).not.toContain("!");
  });

  it("filters out single-character tokens", () => {
    const tokens = tokenize("a b c hello");
    expect(tokens).not.toContain("a");
    expect(tokens).toContain("hello");
  });

  it("handles Devanagari text", () => {
    const tokens = tokenize("कानूनी सहायता");
    expect(tokens.length).toBeGreaterThan(0);
  });

  it("handles empty string", () => {
    expect(tokenize("")).toHaveLength(0);
  });
});
