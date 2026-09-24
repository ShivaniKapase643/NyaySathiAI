/**
 * Tests for input validators.
 */
import { describe, it, expect } from "vitest";
import { QAInputSchema, SimplifyInputSchema, DraftInputSchema, validateUpload } from "@/lib/security/validators";

describe("QAInputSchema", () => {
  it("accepts a valid question in English", () => {
    const result = QAInputSchema.safeParse({ question: "How do I file an RTI?", language: "en" });
    expect(result.success).toBe(true);
  });

  it("accepts a valid Hindi question", () => {
    const result = QAInputSchema.safeParse({ question: "RTI कैसे दाखिल करें?", language: "hi" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty question", () => {
    const result = QAInputSchema.safeParse({ question: "", language: "en" });
    expect(result.success).toBe(false);
  });

  it("rejects a question over 1000 characters", () => {
    const result = QAInputSchema.safeParse({ question: "a".repeat(1001), language: "en" });
    expect(result.success).toBe(false);
  });

  it("accepts exactly 1000 characters", () => {
    const result = QAInputSchema.safeParse({ question: "a".repeat(1000), language: "en" });
    expect(result.success).toBe(true);
  });

  it("rejects unsupported language", () => {
    const result = QAInputSchema.safeParse({ question: "test", language: "fr" });
    expect(result.success).toBe(false);
  });

  it("defaults language to en", () => {
    const result = QAInputSchema.safeParse({ question: "What is RTI?" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.language).toBe("en");
  });
});

describe("SimplifyInputSchema", () => {
  it("accepts valid document text", () => {
    const result = SimplifyInputSchema.safeParse({ text: "This is a rental agreement.", language: "en" });
    expect(result.success).toBe(true);
  });

  it("rejects text over 15000 characters", () => {
    const result = SimplifyInputSchema.safeParse({ text: "a".repeat(15001), language: "en" });
    expect(result.success).toBe(false);
  });

  it("rejects empty text", () => {
    const result = SimplifyInputSchema.safeParse({ text: "", language: "en" });
    expect(result.success).toBe(false);
  });
});

describe("DraftInputSchema", () => {
  it("accepts valid RTI draft input", () => {
    const result = DraftInputSchema.safeParse({
      templateId: "rti",
      fields: { applicantName: "Test", informationSought: "Test info" },
      language: "en",
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown templateId", () => {
    const result = DraftInputSchema.safeParse({
      templateId: "unknown_template",
      fields: {},
      language: "en",
    });
    expect(result.success).toBe(false);
  });
});

describe("validateUpload", () => {
  it("rejects oversized files", () => {
    const buf = Buffer.alloc(3 * 1024 * 1024); // 3 MB
    const result = validateUpload(buf, "text/plain", "file.txt");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain("2 MB");
  });

  it("rejects disallowed extension (.exe)", () => {
    const buf = Buffer.alloc(100);
    const result = validateUpload(buf, "application/octet-stream", "virus.exe");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain("extension");
  });

  it("rejects spoofed PDF (wrong magic bytes)", () => {
    const buf = Buffer.from("This is not a PDF but named .pdf");
    const result = validateUpload(buf, "application/pdf", "fake.pdf");
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.reason).toContain("valid PDF");
  });

  it("accepts valid .txt file", () => {
    const buf = Buffer.from("Hello world", "utf-8");
    const result = validateUpload(buf, "text/plain", "document.txt");
    expect(result.valid).toBe(true);
  });

  it("accepts a real PDF (correct magic bytes)", () => {
    const buf = Buffer.concat([Buffer.from([0x25, 0x50, 0x44, 0x46]), Buffer.alloc(100)]);
    const result = validateUpload(buf, "application/pdf", "real.pdf");
    expect(result.valid).toBe(true);
  });
});
