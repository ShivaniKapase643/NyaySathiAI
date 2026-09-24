import { NextRequest, NextResponse } from "next/server";
import { QAInputSchema } from "@/lib/security/validators";
import { redactPII } from "@/lib/security/redact";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { retrieve, formatContext } from "@/lib/rag/retrieve";
import { getLLMProvider } from "@/lib/llm/provider";
import { QA_SYSTEM_PROMPT, buildQAPrompt } from "@/lib/llm/prompts";
import { qaCache, normalizeCacheKey } from "@/lib/cache";
import legalAidData from "@/data/legal-aid.json";

export const runtime = "nodejs";

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  const rl = checkRateLimit(ip);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "Too many requests. Please wait before trying again.",
        retryAfterMs: rl.retryAfterMs,
      },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((rl.retryAfterMs ?? 60000) / 1000)) },
      }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = QAInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { question, language } = parsed.data;

  // Redact PII before any processing or logging
  const { redacted: cleanQuestion } = redactPII(question);

  // Check cache
  const cacheKey = normalizeCacheKey(cleanQuestion, language);
  const cached = qaCache.get(cacheKey);
  if (cached) {
    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(cached));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Cache": "HIT" } }
    );
  }

  // Retrieve relevant chunks
  const retrieval = retrieve(cleanQuestion, 4);

  // Low-confidence path — do NOT call LLM
  if (!retrieval.confident) {
    const nalsa = (legalAidData as { helplines: Array<{ name: string; phone: string | null; url: string }> }).helplines[0];
    const fallbackText =
      language === "hi"
        ? `मुझे यकीन नहीं है — मेरे पास उपलब्ध स्रोत इस विषय को पूरी तरह कवर नहीं करते।\n\nमुफ़्त कानूनी मदद के लिए:\n• NALSA हेल्पलाइन: ${nalsa.phone ?? "15100"}\n• वेबसाइट: ${nalsa.url}`
        : language === "mr"
        ? `मला खात्री नाही — माझ्याकडे उपलब्ध स्रोत या विषयाचे पूर्णपणे कव्हर करत नाहीत.\n\nमोफत कायदेशीर मदतीसाठी:\n• NALSA हेल्पलाइन: ${nalsa.phone ?? "15100"}\n• वेबसाइट: ${nalsa.url}`
        : `I'm not sure — the sources I have don't cover this topic fully.\n\nFor free legal help:\n• NALSA Helpline: ${nalsa.phone ?? "15100"}\n• Website: ${nalsa.url}`;

    return new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(fallbackText));
          controller.close();
        },
      }),
      {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Confidence": "low",
        },
      }
    );
  }

  const context = formatContext(retrieval.chunks);
  const hasUnverified = retrieval.chunks.some((c) => !c.verified);

  const langInstruction =
    language === "hi"
      ? "Respond entirely in Hindi (Devanagari script)."
      : language === "mr"
      ? "Respond entirely in Marathi (Devanagari script)."
      : "Respond in English.";

  const systemPrompt = `${QA_SYSTEM_PROMPT}\n\nLanguage instruction: ${langInstruction}`;
  const userMessage = buildQAPrompt(context, cleanQuestion);

  try {
    const provider = getLLMProvider();
    const encoder = new TextEncoder();
    let fullResponse = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of provider.streamChat({
            systemPrompt,
            messages: [{ role: "user", content: userMessage }],
          })) {
            fullResponse += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
          // Cache the full response
          qaCache.set(cacheKey, fullResponse);
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          let safeMsg = "LLM service error. Please try again.";
          if (msg.includes("401") || msg.includes("authentication") || msg.includes("credentials")) {
            safeMsg = "API key is invalid or expired. Please update GEMINI_API_KEY in Vercel environment variables.";
          } else if (msg.includes("API_KEY_INVALID") || msg.includes("invalid api key")) {
            safeMsg = "Invalid API key. Please update GEMINI_API_KEY in Vercel environment variables.";
          } else if (msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429")) {
            safeMsg = "API quota exceeded. Please try again in a few minutes.";
          } else if (msg.includes("404") || msg.includes("not found") || msg.includes("MODEL_NOT_FOUND")) {
            safeMsg = "AI model not available. Please update GEMINI_MODEL in Vercel environment variables.";
          } else if (msg.includes("timeout") || msg.includes("timed out")) {
            safeMsg = "Request timed out. Please try again.";
          }
          controller.enqueue(encoder.encode(`\n\n[Error: ${safeMsg}]`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Confidence": "high",
        "X-Unverified": hasUnverified ? "true" : "false",
        "X-Sources": encodeURIComponent(JSON.stringify(
          retrieval.chunks.map((c) => ({
            id: c.id,
            act: c.act,
            section: c.section,
            title: c.title,
            source_url: c.source_url,
            verified: c.verified,
          }))
        )),
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Service error";
    // Never leak internal error details
    const safeMsg = msg.startsWith("GEMINI_API_KEY")
      ? "The AI service is not configured. Please contact support."
      : "AI service is temporarily unavailable. Please try again.";
    return NextResponse.json({ error: safeMsg }, { status: 503 });
  }
}
