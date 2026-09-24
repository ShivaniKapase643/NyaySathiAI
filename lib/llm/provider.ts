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

let _instance: LLMProvider | null = null;

/**
 * Returns the configured LLM provider singleton.
 * Lazy-initialised so missing API keys fail at request time, not startup.
 */
export function getLLMProvider(): LLMProvider {
  if (!_instance) {
    _instance = new GeminiProvider();
  }
  return _instance;
}

/** Reset the singleton (test helper). */
export function resetLLMProvider(): void {
  _instance = null;
}
