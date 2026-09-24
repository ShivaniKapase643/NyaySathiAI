/**
 * Google Gemini provider implementation.
 * Uses the @google/generative-ai SDK with streaming support.
 */
import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import type { LLMProvider, LLMStreamOptions } from "./provider";
import { withRetry } from "./retry";

const MODEL_NAME = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export class GeminiProvider implements LLMProvider {
  private genAI: GoogleGenerativeAI;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not set. Please add it to your .env.local file. " +
          "Get a free key at https://makersuite.google.com/app/apikey"
      );
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async *streamChat(options: LLMStreamOptions): AsyncIterable<string> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: options.systemPrompt,
      safetySettings: SAFETY_SETTINGS,
    });

    const history = options.messages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const lastMessage = options.messages[options.messages.length - 1];

    const chat = model.startChat({ history });

    const result = await withRetry(() =>
      chat.sendMessageStream(lastMessage.content)
    );

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
  }

  async chat(options: LLMStreamOptions): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      systemInstruction: options.systemPrompt,
      safetySettings: SAFETY_SETTINGS,
    });

    const history = options.messages.slice(0, -1).map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    }));

    const lastMessage = options.messages[options.messages.length - 1];
    const chat = model.startChat({ history });

    const result = await withRetry(() => chat.sendMessage(lastMessage.content));
    return result.response.text();
  }
}
