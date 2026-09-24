/**
 * Builds the BM25 index from corpus.json at module load time.
 * The index is reused across all requests (singleton pattern).
 */
import corpusData from "@/data/corpus.json";
import { BM25Index, tokenize, type BM25Document } from "./bm25";

export interface CorpusChunk {
  id: string;
  act: string;
  section: string;
  title: string;
  text: string;
  source_url: string;
  language: "en";
  verified: boolean;
  keywords?: string[];
}

const chunks = corpusData as CorpusChunk[];

/** Convert corpus chunks into BM25 documents (tokenise text + title + act/section). */
const bm25Docs: BM25Document[] = chunks.map((chunk) => ({
  id: chunk.id,
  terms: tokenize(
    `${chunk.title} ${chunk.act} ${chunk.section} ${chunk.text} ${(chunk.keywords ?? []).join(" ")}`
  ),
  metadata: chunk as unknown as Record<string, unknown>,
}));

/** Singleton BM25 index — built once at startup. */
export const INDEX = new BM25Index(bm25Docs);

/** Raw corpus chunks accessible by id. */
export const CORPUS_MAP = new Map(chunks.map((c) => [c.id, c]));

export { chunks as CORPUS };
