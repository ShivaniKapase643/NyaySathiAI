import { NextRequest, NextResponse } from "next/server";
import { SimplifyInputSchema } from "@/lib/security/validators";
import { redactPII } from "@/lib/security/redact";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { checkInjection, wrapDocumentForPrompt } from "@/lib/security/injectionGuard";
import { getLLMProvider } from "@/lib/llm/provider";
import { SIMPLIFY_SYSTEM_PROMPT, buildSimplifyPrompt } from "@/lib/llm/prompts";
import { simplifyCache, normalizeCacheKey } from "@/lib/cache";
import { getIP } from "@/lib/request";
import { z } from "zod";
import { createHash } from "crypto";

export const runtime = "nodejs";

// Hoisted module-level regexes — compiled once, not per request
const JSON_FENCE_RE = /```(?:json)?\s*([\s\S]*?)```/;
const JSON_OBJECT_RE = /(\{[\s\S]*\})/;

/** Zod schema for LLM structured output */
const SimplifyOutputSchema = z.object({
  summary: z.string(),
  documentType: z.string(),
  keyParties: z.array(z.string()).default([]),
  keyDates: z.array(z.string()).default([]),
  deadlines: z.array(z.string()).default([]),
  redFlags: z.array(z.object({ clause: z.string(), risk: z.string() })).default([]),
  nextSteps: z.array(z.string()).default([]),
  disclaimer: z.string().optional(),
});

/**
 * Stable cache key for document simplification.
 * Uses a SHA-256 hash of the full text so documents with identical first 200 chars
 * but different bodies don't collide (previous bug).
 */
function simplifyCacheKey(text: string, language: string): string {
  const hash = createHash("sha256").update(text).digest("hex").slice(0, 16);
  return `simplify:${language}:${hash}`;
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = SimplifyInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { text, language } = parsed.data;

  // Injection guard before redaction (patterns easier to detect in raw text)
  const injectionCheck = checkInjection(text);
  if (!injectionCheck.safe) {
    return NextResponse.json(
      { error: "Document contains potentially unsafe content and cannot be processed." },
      { status: 400 }
    );
  }

  // Redact PII before sending to LLM
  const { redacted: cleanText } = redactPII(text);

  // Stable cache key using full-text hash — no first-200-chars collision bug
  const cacheKey = simplifyCacheKey(cleanText, language);
  const cached = simplifyCache.get(cacheKey);
  if (cached) {
    try {
      return NextResponse.json(JSON.parse(cached), { status: 200, headers: { "X-Cache": "HIT" } });
    } catch { /* ignore — fall through to LLM */ }
  }

  const langInstruction =
    language === "hi"
      ? "Respond entirely in Hindi (Devanagari script). All field values in the JSON must be in Hindi."
      : language === "mr"
      ? "Respond entirely in Marathi (Devanagari script). All field values in the JSON must be in Marathi."
      : "Respond in English.";

  const systemPrompt = `${SIMPLIFY_SYSTEM_PROMPT}\nLanguage instruction: ${langInstruction}`;
  const wrappedText = wrapDocumentForPrompt(cleanText);
  const userMessage = buildSimplifyPrompt(wrappedText);

  try {
    // In-flight deduplication: concurrent identical documents share one LLM call
    const rawResponse = await simplifyCache.getOrSetInFlight(
      `inflight:${cacheKey}`,
      async () => {
        const provider = getLLMProvider(); // singleton
        return provider.chat({
          systemPrompt,
          messages: [{ role: "user", content: userMessage }],
          signal: req.signal, // AbortSignal for client disconnect
        });
      }
    );

    // Extract JSON — use hoisted module-level regexes (not re-compiled per call)
    const jsonMatch = JSON_FENCE_RE.exec(rawResponse) ?? JSON_OBJECT_RE.exec(rawResponse);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawResponse;

    let parsed2: unknown;
    try {
      parsed2 = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse AI response. Please try again." },
        { status: 502 }
      );
    }

    const validated = SimplifyOutputSchema.safeParse(parsed2);
    if (!validated.success) {
      return NextResponse.json(
        { error: "AI response had unexpected format. Please try again." },
        { status: 502 }
      );
    }

    // Cache validated result
    simplifyCache.set(cacheKey, JSON.stringify(validated.data));
    return NextResponse.json(validated.data, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Service error";
    if (msg.includes("aborted") || msg.includes("abort")) {
      return NextResponse.json({ error: "Request cancelled." }, { status: 499 });
    }
    const safeMsg = msg.startsWith("GEMINI_API_KEY")
      ? "AI service is not configured."
      : "AI service is temporarily unavailable. Please try again.";
    return NextResponse.json({ error: safeMsg }, { status: 503 });
  }
}
