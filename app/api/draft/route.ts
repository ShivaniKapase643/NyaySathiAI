import { NextRequest, NextResponse } from "next/server";
import { DraftInputSchema } from "@/lib/security/validators";
import { checkRateLimit } from "@/lib/security/rateLimit";
import {
  generateRTITemplate,
  generateConsumerComplaintTemplate,
  generateLegalNoticeTemplate,
} from "@/lib/drafting/templates";
import {
  RTIFieldsSchema,
  ConsumerComplaintFieldsSchema,
  LegalNoticeFieldsSchema,
} from "@/lib/drafting/schemas";
import { getLLMProvider } from "@/lib/llm/provider";
import { DRAFT_SYSTEM_PROMPT, buildDraftPrompt } from "@/lib/llm/prompts";
import { LRUCache } from "@/lib/cache";
import { getIP } from "@/lib/request";

export const runtime = "nodejs";

// Draft translation cache — bounded at 30 entries, 30 min TTL
// LLM is only called for Hindi/Marathi; English drafts are fully deterministic
const draftCache = new LRUCache(30, 30 * 60 * 1000);

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  mr: "Marathi",
};

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

  const parsed = DraftInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { templateId, fields, language } = parsed.data;

  let templateResult: { title: string; body: string };

  try {
    if (templateId === "rti") {
      const fp = RTIFieldsSchema.safeParse(fields);
      if (!fp.success) {
        return NextResponse.json({ error: "Invalid RTI fields", details: fp.error.flatten() }, { status: 400 });
      }
      templateResult = generateRTITemplate(fp.data);
    } else if (templateId === "consumer_complaint") {
      const fp = ConsumerComplaintFieldsSchema.safeParse(fields);
      if (!fp.success) {
        return NextResponse.json({ error: "Invalid consumer complaint fields", details: fp.error.flatten() }, { status: 400 });
      }
      templateResult = generateConsumerComplaintTemplate(fp.data);
    } else {
      const fp = LegalNoticeFieldsSchema.safeParse(fields);
      if (!fp.success) {
        return NextResponse.json({ error: "Invalid legal notice fields", details: fp.error.flatten() }, { status: 400 });
      }
      templateResult = generateLegalNoticeTemplate(fp.data);
    }
  } catch {
    return NextResponse.json({ error: "Failed to generate template. Please check your inputs." }, { status: 400 });
  }

  // English: fully deterministic, no LLM call needed
  if (language === "en") {
    return NextResponse.json({ title: templateResult.title, body: templateResult.body });
  }

  // Non-English: cache by templateId + fields hash + language to avoid repeat LLM calls
  const cacheKey = `draft:${templateId}:${language}:${JSON.stringify(fields)}`.slice(0, 256);
  const cached = draftCache.get(cacheKey);
  if (cached) {
    try {
      const cachedResult = JSON.parse(cached) as { title: string; body: string };
      return NextResponse.json({ ...cachedResult, cached: true });
    } catch { /* fall through */ }
  }

  try {
    const provider = getLLMProvider(); // singleton
    const langName = LANGUAGE_NAMES[language] ?? "English";
    const userMessage = buildDraftPrompt(templateResult.body, langName);

    const polished = await provider.chat({
      systemPrompt: DRAFT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
      signal: req.signal,
    });

    const result = { title: templateResult.title, body: polished };
    draftCache.set(cacheKey, JSON.stringify(result));
    return NextResponse.json(result);
  } catch {
    // Graceful fallback to English when translation fails
    return NextResponse.json({
      title: templateResult.title,
      body: templateResult.body,
      warning: "Translation unavailable — showing English version.",
    });
  }
}
