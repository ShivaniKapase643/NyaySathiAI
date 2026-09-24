import { NextRequest, NextResponse } from "next/server";
import { SimplifyInputSchema } from "@/lib/security/validators";
import { redactPII } from "@/lib/security/redact";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { checkInjection, wrapDocumentForPrompt } from "@/lib/security/injectionGuard";
import { getLLMProvider } from "@/lib/llm/provider";
import { SIMPLIFY_SYSTEM_PROMPT, buildSimplifyPrompt } from "@/lib/llm/prompts";
import { z } from "zod";

export const runtime = "nodejs";

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/** Zod schema for the structured output from the LLM */
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

  // Injection guard — check before redacting so patterns are not obscured
  const injectionCheck = checkInjection(text);
  if (!injectionCheck.safe) {
    return NextResponse.json(
      { error: "Document contains potentially unsafe content and cannot be processed." },
      { status: 400 }
    );
  }

  // Redact PII in document before sending to LLM
  const { redacted: cleanText } = redactPII(text);

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
    const provider = getLLMProvider();
    const rawResponse = await provider.chat({
      systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    // Extract JSON from response (model may wrap it in markdown code fences)
    const jsonMatch = rawResponse.match(/```(?:json)?\s*([\s\S]*?)```/) ??
      rawResponse.match(/(\{[\s\S]*\})/);
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

    return NextResponse.json(validated.data, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Service error";
    const safeMsg = msg.startsWith("GEMINI_API_KEY")
      ? "AI service is not configured."
      : "AI service is temporarily unavailable. Please try again.";
    return NextResponse.json({ error: safeMsg }, { status: 503 });
  }
}
