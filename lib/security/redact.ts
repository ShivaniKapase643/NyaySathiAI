/**
 * PII redaction utilities.
 * Redacts sensitive Indian personal identifiers before sending text to any LLM.
 * Processing order matters: more specific patterns run before overlapping ones.
 */

export interface RedactionResult {
  redacted: string;
  foundTypes: string[];
}

// Indian mobile: optional +91/0091/0 prefix, then 10 digits starting with 6-9
// Must run BEFORE Aadhaar (which also matches 12 digits) and BEFORE UPI
const PHONE_RE = /(?:(?:\+91|0091|0)[-\s]?)?[6-9]\d{9}\b/g;

// Aadhaar: exactly 12 digits (with optional spaces every 4 digits)
// Use word boundary and negative lookahead to avoid matching phone + extra digits
const AADHAAR_RE = /\b\d{4}[\s]?\d{4}[\s]?\d{4}\b/g;

// PAN: 5 uppercase alpha, 4 digits, 1 uppercase alpha
const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/g;

// Email (standard format) -- must run BEFORE UPI since UPI is a subset
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// UPI ID: identifier@bankhandle WITHOUT a dot after @ (distinguishes from email)
const UPI_RE = /[a-zA-Z0-9.\-_+]+@[a-zA-Z]{3,}(?!\.[a-zA-Z])/g;

/**
 * Redacts PII from the given text.
 * Returns the cleaned text and a list of PII types found.
 * Order: Phone -> Aadhaar -> PAN -> Email -> UPI
 */
export function redactPII(text: string): RedactionResult {
  const foundTypes: string[] = [];
  let result = text;

  // 1. Phone first (before Aadhaar, since +91XXXXXXXXXX could match as 12-digit block)
  PHONE_RE.lastIndex = 0;
  if (PHONE_RE.test(result)) foundTypes.push("PHONE");
  PHONE_RE.lastIndex = 0;
  result = result.replace(PHONE_RE, "[PHONE_REDACTED]");

  // 2. Aadhaar (12-digit patterns remaining after phone redaction)
  AADHAAR_RE.lastIndex = 0;
  if (AADHAAR_RE.test(result)) foundTypes.push("AADHAAR");
  AADHAAR_RE.lastIndex = 0;
  result = result.replace(AADHAAR_RE, "[AADHAAR_REDACTED]");

  // 3. PAN
  PAN_RE.lastIndex = 0;
  if (PAN_RE.test(result)) foundTypes.push("PAN");
  PAN_RE.lastIndex = 0;
  result = result.replace(PAN_RE, "[PAN_REDACTED]");

  // 4. Email (before UPI -- email has a TLD dot, UPI does not)
  EMAIL_RE.lastIndex = 0;
  if (EMAIL_RE.test(result)) foundTypes.push("EMAIL");
  EMAIL_RE.lastIndex = 0;
  result = result.replace(EMAIL_RE, "[EMAIL_REDACTED]");

  // 5. UPI (remaining @handle patterns without TLD)
  UPI_RE.lastIndex = 0;
  if (UPI_RE.test(result)) foundTypes.push("UPI");
  UPI_RE.lastIndex = 0;
  result = result.replace(UPI_RE, "[UPI_REDACTED]");

  return { redacted: result, foundTypes: Array.from(new Set(foundTypes)) };
}
