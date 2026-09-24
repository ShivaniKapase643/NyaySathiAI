/**
 * Retrieval layer.
 * Runs BM25 search and applies a confidence threshold.
 */
import { INDEX, CORPUS_MAP, type CorpusChunk } from "./index";

/** Minimum BM25 score to consider a result relevant. */
export const CONFIDENCE_THRESHOLD = 1.0;

export interface RetrievedChunk extends CorpusChunk {
  score: number;
}

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  /** True if the best score meets the confidence threshold */
  confident: boolean;
}

/**
 * Retrieves the top-k relevant chunks for a query.
 * Returns a confidence flag — callers should not invoke the LLM when !confident.
 */
export function retrieve(query: string, k: number = 4): RetrievalResult {
  const results = INDEX.search(query, k);

  if (results.length === 0 || results[0].score < CONFIDENCE_THRESHOLD) {
    return { chunks: [], confident: false };
  }

  const chunks: RetrievedChunk[] = results
    .filter((r) => r.score >= CONFIDENCE_THRESHOLD)
    .map((r) => ({
      ...(CORPUS_MAP.get(r.id)!),
      score: r.score,
    }));

  return { chunks, confident: chunks.length > 0 };
}

/**
 * Formats retrieved chunks into a context block for the LLM prompt.
 * Each chunk is numbered and includes act/section citation.
 */
export function formatContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] ${c.act} — ${c.section}\nTitle: ${c.title}\nText: ${c.text}\nSource: ${c.source_url}`
    )
    .join("\n\n");
}
