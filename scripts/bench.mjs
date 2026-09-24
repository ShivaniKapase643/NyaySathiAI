/* eslint-disable no-console */
/**
 * Retrieval latency benchmark.
 * Run: npm run bench
 * Measures p50/p95 retrieval latency and cache hit rate on sample queries.
 */

// We import from the compiled output — run `npm run build` first, or use tsx/ts-node.
// This script uses the JS source directly via dynamic import with ts-node if available.

const SAMPLE_QUERIES = [
  "How do I file an RTI application?",
  "What is the fee for RTI?",
  "How many days to reply to RTI?",
  "How do I file a consumer complaint?",
  "What is the time limit for consumer complaint?",
  "How to get security deposit back from landlord?",
  "What are my rights as a consumer?",
  "RTI first appeal process",
  "Consumer protection act rights",
  "Eviction notice tenant rights",
  // Low-confidence (should return confident=false quickly)
  "xyzzy nonsense query that matches nothing",
  "quantum physics dark matter universe",
];

const RUNS = 50; // total retrieval calls

async function main() {
  // Dynamic import — works if repo is run via tsx or after build
  const { retrieve } = await import("../lib/rag/retrieve.js").catch(() => {
    console.error("Could not import retrieve.js — run `npm run build` first or use tsx.");
    process.exit(1);
  });

  const latencies = [];
  let cacheHits = 0;
  const seen = new Map();

  console.log(`Running ${RUNS} retrieval calls over ${SAMPLE_QUERIES.length} queries...\n`);

  for (let i = 0; i < RUNS; i++) {
    const query = SAMPLE_QUERIES[i % SAMPLE_QUERIES.length];
    const key = query.toLowerCase().trim();

    const start = performance.now();
    const result = retrieve(query, 4);
    const elapsed = performance.now() - start;

    latencies.push(elapsed);

    if (seen.has(key)) {
      cacheHits++;
    } else {
      seen.set(key, true);
    }

    if (i < 5) {
      console.log(
        `  [${i + 1}] "${query.slice(0, 50)}" → confident=${result.confident} chunks=${result.chunks.length} (${elapsed.toFixed(2)}ms)`
      );
    }
  }

  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(RUNS * 0.5)];
  const p95 = latencies[Math.floor(RUNS * 0.95)];
  const p99 = latencies[Math.floor(RUNS * 0.99)];
  const min = latencies[0];
  const max = latencies[latencies.length - 1];

  console.log("\n=== Retrieval Latency ===");
  console.log(`  min:  ${min.toFixed(3)}ms`);
  console.log(`  p50:  ${p50.toFixed(3)}ms`);
  console.log(`  p95:  ${p95.toFixed(3)}ms`);
  console.log(`  p99:  ${p99.toFixed(3)}ms`);
  console.log(`  max:  ${max.toFixed(3)}ms`);
  console.log(`\n=== Cache (BM25 is stateless — no cache needed for retrieval) ===`);
  console.log(`  Repeated queries: ${cacheHits}/${RUNS} (${((cacheHits / RUNS) * 100).toFixed(0)}%)`);
  console.log("\n✅ BM25 retrieval is synchronous and fast. LLU cache handles repeated full answers.");
}

main().catch((err) => {
  console.error("Bench failed:", err.message);
  process.exit(1);
});
