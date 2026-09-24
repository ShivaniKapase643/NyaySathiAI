/**
 * Minimal BM25 implementation.
 * Singleton: index built once per server instance, O(1) reuse across requests.
 */

export interface BM25Document {
  id: string;
  terms: string[];
  metadata: Record<string, unknown>;
}

export interface BM25Result {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

const K1 = 1.5;
const B = 0.75;

// Precompiled module-level regex — never re-compiled per call
const PUNCT_RE = /[^\w\s\u0900-\u097F\u0A00-\u0A7F]/g;
const WS_RE = /\s+/;

/**
 * Tokenises text: lowercase, strip punctuation, split on whitespace.
 * Keeps tokens ≥2 ASCII chars OR any single non-ASCII char (Devanagari, etc.).
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(PUNCT_RE, " ")
    .split(WS_RE)
    .filter((t) => {
      if (t.length === 0) return false;
      if (t.length === 1) return t.charCodeAt(0) > 127; // allow Devanagari single chars
      return true;
    });
}

export class BM25Index {
  private readonly docs: BM25Document[];
  private readonly avgDocLen: number;
  /** term → (docId → tf) */
  private readonly tf: Map<string, Map<string, number>>;
  /** term → document frequency */
  private readonly df: Map<string, number>;
  /** Singleton doc-by-id map for O(1) lookup — avoids O(n) Array.find in search() */
  private readonly docById: Map<string, BM25Document>;
  private readonly N: number;

  constructor(docs: BM25Document[]) {
    this.docs = docs;
    this.N = docs.length;
    this.tf = new Map();
    this.df = new Map();
    // O(1) doc lookup — eliminates the Array.find O(n) scan inside search()
    this.docById = new Map(docs.map((d) => [d.id, d]));

    let totalLen = 0;
    for (const doc of docs) {
      totalLen += doc.terms.length;
      const termCounts = new Map<string, number>();
      for (const term of doc.terms) {
        termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
      }
      // Iterate Map directly — no Array.from() copy needed
      for (const [term, count] of termCounts) {
        if (!this.tf.has(term)) this.tf.set(term, new Map());
        this.tf.get(term)!.set(doc.id, count);
        this.df.set(term, (this.df.get(term) ?? 0) + 1);
      }
    }
    this.avgDocLen = this.N > 0 ? totalLen / this.N : 1;
  }

  /**
   * Returns top-k documents sorted by descending BM25 score.
   * Uses an inverted-index approach: only scores docs that contain a query term.
   * O(unique_matching_docs × query_terms) — much better than O(N × query_terms).
   */
  search(query: string, k = 4): BM25Result[] {
    const queryTerms = tokenize(query);
    const docScores = new Map<string, number>();

    for (const term of queryTerms) {
      const df_t = this.df.get(term) ?? 0;
      if (df_t === 0) continue;

      const idf = Math.log((this.N - df_t + 0.5) / (df_t + 0.5) + 1);
      const termDocs = this.tf.get(term)!;

      // Inverted index: only iterate docs that actually contain this term
      for (const [docId, tf_td] of termDocs) {
        const doc = this.docById.get(docId)!; // O(1) lookup
        const docLen = doc.terms.length;
        const tf_norm =
          (tf_td * (K1 + 1)) /
          (tf_td + K1 * (1 - B + B * (docLen / this.avgDocLen)));
        docScores.set(docId, (docScores.get(docId) ?? 0) + idf * tf_norm);
      }
    }

    // Collect, sort, slice — no Array.from() needed
    const results: BM25Result[] = [];
    for (const [id, score] of docScores) {
      results.push({ id, score, metadata: this.docById.get(id)!.metadata });
    }
    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }
}
