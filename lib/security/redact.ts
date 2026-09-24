/**
 * PII redaction utilities.
 * Single-pass per pattern using replace callbacks — eliminates the previous
 * double-scan (.test() then .replace()) that cost 10 regex passes per call.
 *
 * Processing order matters: more-specific patterns run before overlapping ones.
 * All regexes are module-level constants — compiled exactly once.
 */

export interface RedactionResult {
  redacted: string;
  foundTypes: string[];
}

// Module-level compiled regexes — never recompiled per call
// Phone first (before Aadhaar): +91/0 prefix + 10 digits starting 6-9
const PHONE_RE = /(?:(?:\+91|0091|0)[-\s]?)?[6-9]\d{9}\b/g;
// Aadhaar: 12 digits, optionally spaced every 4
const AADHAAR_RE = /\b\d{4}[\s]?\d{4}[\s]?\d{4}\b/g;
// PAN: 5 upper alpha, 4 digits, 1 upper alpha
const PAN_RE = /\b[A-Z]{5}\d{4}[A-Z]\b/g;
// Email before UPI (email has a TLD dot; UPI does not)
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
// UPI: identifier@bankhandle without a dot after @
const UPI_RE = /[a-zA-Z0-9.\-_+]+@[a-zA-Z]{3,}(?!\.[a-zA-Z])/g;

/**
 * Redacts PII in a single pass per pattern using replace callbacks.
 * Returns the sanitised string and a deduplicated list of PII types found.
 */
export function redactPII(text: string): RedactionResult {
  const foundSet = new Set<string>();
  let result = text;

  // Single-pass replace: callback fires once per match, sets the flag, returns placeholder
  PHONE_RE.lastIndex = 0;
  result = result.replace(PHONE_RE, () => { foundSet.add("PHONE"); return "[PHONE_REDACTED]"; });

  AADHAAR_RE.lastIndex = 0;
  result = result.replace(AADHAAR_RE, () => { foundSet.add("AADHAAR"); return "[AADHAAR_REDACTED]"; });

  PAN_RE.lastIndex = 0;
  result = result.replace(PAN_RE, () => { foundSet.add("PAN"); return "[PAN_REDACTED]"; });

  EMAIL_RE.lastIndex = 0;
  result = result.replace(EMAIL_RE, () => { foundSet.add("EMAIL"); return "[EMAIL_REDACTED]"; });

  UPI_RE.lastIndex = 0;
  result = result.replace(UPI_RE, () => { foundSet.add("UPI"); return "[UPI_REDACTED]"; });

  return { redacted: result, foundTypes: Array.from(foundSet) };
}
