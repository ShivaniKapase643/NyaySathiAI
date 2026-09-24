/**
 * Shared request utilities — extracted to avoid duplication across API routes.
 */
import type { NextRequest } from "next/server";

/**
 * Extracts the client IP address from standard proxy headers.
 * Used by all API routes for rate limiting.
 */
export function getIP(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Detects whether a string contains Devanagari script (Hindi or Marathi).
 * Used to skip unnecessary LLM translation calls for English-only queries.
 * Checks the Unicode block U+0900–U+097F (Devanagari).
 */
export function containsDevanagari(text: string): boolean {
  return /[\u0900-\u097F]/.test(text);
}
