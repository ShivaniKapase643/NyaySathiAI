/**
 * Google Gemini provider implementation.
 * Uses @google/genai SDK (supports AQ. key format).
 * AbortSignal is plumbed through so client disconnects cancel upstream calls.
 */
import { GoogleGenAI } from "@google/genai";
import type { LLMProvider, LLMStreamOptions } from "./provider";
import { withRetry } from "./retry";

// Read model name once at module load — never changes at runtime
const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

// Output token limits per use-case to bound LLM cost and latency
const QA_MAX_TOKENS = 1024;
const SIMPLIFY_MAX_TOKENS = 2048;
const DRAFT_MAX_TOKENS = 2048;

export class GeminiProvider implements LLMProvider {
  private readonly ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Get a free key at https://aistudio.google.com/app/apikey"
      );
    }
    // GoogleGenAI client constructed once — reused across all requests via singleton
    this.ai = new GoogleGenAI({ apiKey });
  }

  async *streamChat(options: LLMStreamOptions): AsyncIterable<string> {
    const contents = options.messages.map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Pass AbortSignal so a disconnected client cancels the Gemini call immediately
    const result = await withRetry(() =>
      this.ai.models.generateContentStream({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction: options.systemPrompt,
          maxOutputTokens: QA_MAX_TOKENS,
        },
      })
    );

    if (options.signal) {
      options.signal.throwIfAborted?.();
    }

    for await (const chunk of result) {
      // Bail out immediately if the client disconnected
      if (options.signal?.aborted) break;
      const text = chunk.text ?? "";
      if (text) yield text;
    }
  }

  async chat(options: LLMStreamOptions): Promise<string> {
    const contents = options.messages.map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const result = await withRetry(() =>
      this.ai.models.generateContent({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction: options.systemPrompt,
          maxOutputTokens: SIMPLIFY_MAX_TOKENS,
        },
      })
    );

    return result.text ?? "";
  }
}

// Re-export token limits so routes can set them explicitly if needed
export { QA_MAX_TOKENS, SIMPLIFY_MAX_TOKENS, DRAFT_MAX_TOKENS };
