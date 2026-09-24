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

export const runtime = "nodejs";

function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

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

  // Validate and generate template based on type
  let templateResult: { title: string; body: string };

  try {
    if (templateId === "rti") {
      const fieldsParsed = RTIFieldsSchema.safeParse(fields);
      if (!fieldsParsed.success) {
        return NextResponse.json(
          { error: "Invalid RTI fields", details: fieldsParsed.error.flatten() },
          { status: 400 }
        );
      }
      templateResult = generateRTITemplate(fieldsParsed.data);
    } else if (templateId === "consumer_complaint") {
      const fieldsParsed = ConsumerComplaintFieldsSchema.safeParse(fields);
      if (!fieldsParsed.success) {
        return NextResponse.json(
          { error: "Invalid consumer complaint fields", details: fieldsParsed.error.flatten() },
          { status: 400 }
        );
      }
      templateResult = generateConsumerComplaintTemplate(fieldsParsed.data);
    } else {
      const fieldsParsed = LegalNoticeFieldsSchema.safeParse(fields);
      if (!fieldsParsed.success) {
        return NextResponse.json(
          { error: "Invalid legal notice fields", details: fieldsParsed.error.flatten() },
          { status: 400 }
        );
      }
      templateResult = generateLegalNoticeTemplate(fieldsParsed.data);
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate template. Please check your inputs." },
      { status: 400 }
    );
  }

  // If English, return the deterministic template directly (no LLM needed)
  if (language === "en") {
    return NextResponse.json({
      title: templateResult.title,
      body: templateResult.body,
    });
  }

  // For Hindi/Marathi, use LLM to translate/polish
  try {
    const provider = getLLMProvider();
    const langName = LANGUAGE_NAMES[language] ?? "English";
    const userMessage = buildDraftPrompt(templateResult.body, langName);

    const polished = await provider.chat({
      systemPrompt: DRAFT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    return NextResponse.json({
      title: templateResult.title,
      body: polished,
    });
  } catch (err) {
    // Fall back to English template if LLM fails
    return NextResponse.json({
      title: templateResult.title,
      body: templateResult.body,
      warning: "Translation unavailable — showing English version.",
    });
  }
}
