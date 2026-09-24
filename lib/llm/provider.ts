/**
 * LLM provider interface.
 * Swap providers by changing the LLM_PROVIDER env var (default: gemini).
 */
import { GeminiProvider } from "./gemini";

export interface LLMMessage {
  role: "user" | "model";
  content: string;
}

export interface LLMStreamOptions {
  systemPrompt: string;
  messages: LLMMessage[];
  signal?: AbortSignal;
}

export interface LLMProvider {
  /** Returns an async iterable of text chunks (streaming). */
  streamChat(options: LLMStreamOptions): AsyncIterable<string>;
  /** Returns the full response as a string (non-streaming). */
  chat(options: LLMStreamOptions): Promise<string>;
}

/**
 * Returns the configured LLM provider singleton.
 * Creates a new instance each time to avoid caching broken state across requests.
 */
export function getLLMProvider(): LLMProvider {
  return new GeminiProvider();
}
