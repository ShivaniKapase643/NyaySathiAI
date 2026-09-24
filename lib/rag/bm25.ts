/**
 * Minimal BM25 implementation.
 * Built once at module load from the corpus and reused across requests.
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

/** Tokenises text: lowercase, remove punctuation, split on whitespace.
 *  Keeps tokens with at least 2 ASCII characters OR at least 1 non-ASCII
 *  character (so Devanagari single-character words are preserved).
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F\u0A00-\u0A7F]/g, " ")
    .split(/\s+/)
    .filter((t) => {
      if (t.length === 0) return false;
      // Allow single chars only if they are non-ASCII (Devanagari, etc.)
      if (t.length === 1) return t.charCodeAt(0) > 127;
      return true;
    });
}

export class BM25Index {
  private docs: BM25Document[];
  private avgDocLen: number;
  private tf: Map<string, Map<string, number>>;
  private df: Map<string, number>;
  private N: number;

  constructor(docs: BM25Document[]) {
    this.docs = docs;
    this.N = docs.length;
    this.tf = new Map();
    this.df = new Map();

    let totalLen = 0;
    for (const doc of docs) {
      totalLen += doc.terms.length;
      const termCounts = new Map<string, number>();
      for (const term of doc.terms) {
        termCounts.set(term, (termCounts.get(term) ?? 0) + 1);
      }
      for (const [term, count] of Array.from(termCounts)) {
        if (!this.tf.has(term)) this.tf.set(term, new Map());
        this.tf.get(term)!.set(doc.id, count);
        this.df.set(term, (this.df.get(term) ?? 0) + 1);
      }
    }
    this.avgDocLen = this.N > 0 ? totalLen / this.N : 1;
  }

  /** Returns top-k documents sorted by descending BM25 score. */
  search(query: string, k = 4): BM25Result[] {
    const queryTerms = tokenize(query);
    const docScores = new Map<string, number>();

    for (const term of queryTerms) {
      const df_t = this.df.get(term) ?? 0;
      if (df_t === 0) continue;

      const idf = Math.log((this.N - df_t + 0.5) / (df_t + 0.5) + 1);
      const termDocs = this.tf.get(term)!;

      for (const doc of this.docs) {
        const tf_td = termDocs.get(doc.id) ?? 0;
        if (tf_td === 0) continue;

        const docLen = doc.terms.length;
        const tf_norm =
          (tf_td * (K1 + 1)) /
          (tf_td + K1 * (1 - B + B * (docLen / this.avgDocLen)));

        docScores.set(doc.id, (docScores.get(doc.id) ?? 0) + idf * tf_norm);
      }
    }

    const results: BM25Result[] = [];
    for (const [id, score] of Array.from(docScores)) {
      const doc = this.docs.find((d) => d.id === id)!;
      results.push({ id, score, metadata: doc.metadata });
    }

    return results.sort((a, b) => b.score - a.score).slice(0, k);
  }
}
