/**
 * Output sanitization utilities.
 * Ensures LLM output is safe to display without XSS risk.
 * We render via React text nodes / markdown parser — never dangerouslySetInnerHTML with raw output.
 */

/**
 * Strips HTML tags from a string.
 * Used as a defence-in-depth measure before rendering LLM text.
 */
export function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, "");
}

/**
 * Truncates text to a maximum character length, appending ellipsis.
 */
export function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "…";
}

/**
 * Escapes characters that could be interpreted as markdown in contexts
 * where we want literal text (e.g., user-supplied document titles).
 */
export function escapeMarkdown(text: string): string {
  return text.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
}
