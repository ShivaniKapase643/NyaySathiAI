/**
 * Tests for BM25 retrieval.
 * Known queries must return the correct Act/section in top results.
 * Low-confidence queries must NOT return chunks (so the LLM is never called).
 */
import { describe, it, expect } from "vitest";
import { retrieve } from "@/lib/rag/retrieve";
import { BM25Index, tokenize } from "@/lib/rag/bm25";

describe("retrieve -- known queries", () => {
  it("RTI 30-day reply query returns rti-002 in top results", () => {
    const { confident, chunks } = retrieve("How many days does the government have to reply to RTI?", 4);
    expect(confident).toBe(true);
    expect(chunks.map((c) => c.id)).toContain("rti-002");
  });

  it("RTI filing query returns rti-001", () => {
    const { confident, chunks } = retrieve("How do I file an RTI application?", 4);
    expect(confident).toBe(true);
    expect(chunks.map((c) => c.id)).toContain("rti-001");
  });

  it("RTI fee query returns rti-003", () => {
    const { confident, chunks } = retrieve("What is the fee for filing an RTI?", 4);
    expect(confident).toBe(true);
    expect(chunks.map((c) => c.id)).toContain("rti-003");
  });

  it("consumer complaint filing query returns cpa-003", () => {
    const { confident, chunks } = retrieve("How do I file a consumer complaint?", 4);
    expect(confident).toBe(true);
    expect(chunks.map((c) => c.id)).toContain("cpa-003");
  });

  it("security deposit query returns tenancy-001", () => {
    const { confident, chunks } = retrieve("How do I get my security deposit refunded by landlord?", 4);
    expect(confident).toBe(true);
    expect(chunks.map((c) => c.id)).toContain("tenancy-001");
  });

  it("RTI first appeal query returns rti-004", () => {
    const { confident, chunks } = retrieve("What should I do if I am not satisfied with RTI response?", 4);
    expect(confident).toBe(true);
    expect(chunks.map((c) => c.id)).toContain("rti-004");
  });

  it("consumer limitation period query returns cpa-004", () => {
    const { confident, chunks } = retrieve("What is the time limit to file a consumer complaint?", 4);
    expect(confident).toBe(true);
    expect(chunks.map((c) => c.id)).toContain("cpa-004");
  });

  it("low-confidence query returns confident=false", () => {
    const { confident, chunks } = retrieve("zzzzz nonsense gibberish xylophone quantum flux", 4);
    expect(confident).toBe(false);
    expect(chunks).toHaveLength(0);
  });

  it("low-confidence path returns no chunks (LLM must NOT be called)", () => {
    // Callers check !confident before calling LLM; assert no chunks leak through
    const { confident, chunks } = retrieve("xkcd wumbo flerken zorblax grimbold snorkel quaff", 4);
    expect(confident).toBe(false);
    expect(chunks.length).toBe(0);
  });
});

describe("BM25Index -- unit", () => {
  it("returns results sorted by descending score", () => {
    const docs = [
      { id: "a", terms: tokenize("RTI application India government filing"), metadata: {} },
      { id: "b", terms: tokenize("consumer rights buyer seller complaint"), metadata: {} },
    ];
    const idx = new BM25Index(docs);
    const results = idx.search("RTI India government application");
    if (results.length >= 2) {
      expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
    }
  });

  it("empty index returns no results", () => {
    const idx = new BM25Index([]);
    expect(idx.search("anything")).toHaveLength(0);
  });

  it("limits to k results", () => {
    const docs = [
      { id: "1", terms: tokenize("RTI application India government"), metadata: {} },
      { id: "2", terms: tokenize("consumer complaint India rights"), metadata: {} },
      { id: "3", terms: tokenize("tenant rights India deposit"), metadata: {} },
    ];
    const idx = new BM25Index(docs);
    const results = idx.search("India rights application", 2);
    expect(results.length).toBeLessThanOrEqual(2);
  });

  it("empty query returns no results", () => {
    const docs = [{ id: "a", terms: tokenize("RTI application India"), metadata: {} }];
    const idx = new BM25Index(docs);
    expect(idx.search("")).toHaveLength(0);
  });
});
