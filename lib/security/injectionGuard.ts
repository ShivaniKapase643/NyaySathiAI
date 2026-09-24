/**
 * Prompt-injection guard.
 * Detects common injection patterns in user-submitted document text
 * before it is wrapped and sent to the LLM.
 */

/** Known injection attack phrases (case-insensitive). */
const INJECTION_PATTERNS = [
  /ignore\s+(previous|all|prior)\s+instructions/i,
  /disregard\s+(the\s+)?(above|previous|all)\s+(instructions|context|prompt)/i,
  /you\s+are\s+now\s+(a\s+)?different/i,
  /act\s+as\s+(if\s+you\s+are\s+)?(?:an?\s+)?(?:unrestricted|jailbreak|evil|dan)/i,
  /system\s*:\s*you\s+are/i,
  /\[system\]/i,
  /<\|?system\|?>/i,
  /override\s+(your\s+)?(instructions|programming|rules)/i,
  /forget\s+(everything|all)\s+(you\s+)?(know|were\s+told)/i,
  /new\s+instructions?:/i,
  /\bdo\s+anything\s+now\b/i,
  /\bdan\b.*\bmode\b/i,
];

export interface InjectionCheckResult {
  safe: boolean;
  /** Matched pattern description if not safe */
  pattern?: string;
}

/**
 * Checks document text for prompt-injection attempts.
 * Documents are untrusted user data and must never alter system behavior.
 */
export function checkInjection(text: string): InjectionCheckResult {
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      return { safe: false, pattern: pattern.toString() };
    }
  }
  return { safe: true };
}

/**
 * Wraps document content in delimited data tags so the LLM treats it
 * as untrusted data, never as instructions.
 */
export function wrapDocumentForPrompt(text: string): string {
  return `<DOCUMENT_DATA_START>
${text}
<DOCUMENT_DATA_END>`;
}
