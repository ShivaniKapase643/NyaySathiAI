/**
 * Google Gemini provider implementation.
 * Uses the new @google/genai SDK which supports both AIzaSy and AQ. key formats.
 */
import { GoogleGenAI } from "@google/genai";
import type { LLMProvider, LLMStreamOptions } from "./provider";
import { withRetry } from "./retry";

const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

export class GeminiProvider implements LLMProvider {
  private ai: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Please add it to your .env.local file. " +
          "Get a free key at https://aistudio.google.com/app/apikey"
      );
    }
    this.ai = new GoogleGenAI({ apiKey });
  }

  async *streamChat(options: LLMStreamOptions): AsyncIterable<string> {
    const lastMessage = options.messages[options.messages.length - 1];

    const contents = options.messages.map((m) => ({
      role: m.role === "model" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const result = await withRetry(() =>
      this.ai.models.generateContentStream({
        model: MODEL_NAME,
        contents,
        config: {
          systemInstruction: options.systemPrompt,
        },
      })
    );

    for await (const chunk of result) {
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
        },
      })
    );

    return result.text ?? "";
  }
}
