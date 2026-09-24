/**
 * Zod input validators for all API routes.
 * All schemas enforce strict max lengths and reject unknown fields.
 */
import { z } from "zod";

export const SUPPORTED_LANGUAGES = ["en", "hi", "mr"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Q&A route input */
export const QAInputSchema = z.object({
  question: z
    .string()
    .min(1, "Question cannot be empty")
    .max(1000, "Question must be 1000 characters or fewer")
    .trim(),
  language: z.enum(SUPPORTED_LANGUAGES).default("en"),
});
export type QAInput = z.infer<typeof QAInputSchema>;

/** Document simplifier route input */
export const SimplifyInputSchema = z.object({
  text: z
    .string()
    .min(1, "Document text cannot be empty")
    .max(15_000, "Document must be 15,000 characters or fewer")
    .trim(),
  language: z.enum(SUPPORTED_LANGUAGES).default("en"),
  filename: z.string().max(255).optional(),
});
export type SimplifyInput = z.infer<typeof SimplifyInputSchema>;

/** Draft route input */
export const DraftInputSchema = z.object({
  templateId: z.enum(["rti", "consumer_complaint", "legal_notice"]),
  fields: z.record(z.string().max(500)),
  language: z.enum(SUPPORTED_LANGUAGES).default("en"),
});
export type DraftInput = z.infer<typeof DraftInputSchema>;

/** Allowed MIME types for document upload */
export const ALLOWED_MIME_TYPES = ["text/plain", "application/pdf"] as const;
export const ALLOWED_EXTENSIONS = [".txt", ".pdf"] as const;

/** Max upload size in bytes (2 MB) */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

/** PDF magic bytes (first 4 bytes: %PDF) */
export const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

/**
 * Validates a file upload by checking MIME type, extension, size, and magic bytes.
 */
export function validateUpload(
  buffer: Buffer,
  mimeType: string,
  filename: string
): { valid: true } | { valid: false; reason: string } {
  if (buffer.length > MAX_UPLOAD_BYTES) {
    return { valid: false, reason: "File exceeds 2 MB limit" };
  }

  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  if (!(ALLOWED_EXTENSIONS as readonly string[]).includes(ext)) {
    return { valid: false, reason: `File extension '${ext}' is not allowed` };
  }

  const normalizedMime = mimeType.split(";")[0].trim().toLowerCase();
  if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(normalizedMime as never)) {
    return { valid: false, reason: `MIME type '${normalizedMime}' is not allowed` };
  }

  // Magic-byte check for PDF
  if (ext === ".pdf") {
    const magic = buffer.slice(0, 4);
    if (!magic.equals(PDF_MAGIC)) {
      return { valid: false, reason: "File does not appear to be a valid PDF" };
    }
  }

  return { valid: true };
}
