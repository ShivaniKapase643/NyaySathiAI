/**
 * LLM provider interface and singleton factory.
 * Singleton: one GeminiProvider per server instance — avoids reconstructing
 * the GoogleGenAI client (and re-reading env vars) on every request.
 */
import { GeminiProvider } from "./gemini";

export interface LLMMessage {
  role: "user" | "model";
  content: string;
}

export interface LLMStreamOptions {
  systemPrompt: string;
  messages: LLMMessage[];
  /** Pass req.signal so a disconnected client cancels the upstream LLM call. */
  signal?: AbortSignal;
}

export interface LLMProvider {
  streamChat(options: LLMStreamOptions): AsyncIterable<string>;
  chat(options: LLMStreamOptions): Promise<string>;
}

// Singleton — created once per server process lifetime.
// This avoids constructing a new GoogleGenAI client on every request.
let _instance: LLMProvider | null = null;

/**
 * Returns the singleton LLM provider.
 * Safe to call from any request handler — returns the same instance.
 */
export function getLLMProvider(): LLMProvider {
  if (!_instance) {
    _instance = new GeminiProvider();
  }
  return _instance;
}

/** Resets the singleton — used in tests or after a key rotation. */
export function resetLLMProvider(): void {
  _instance = null;
}
