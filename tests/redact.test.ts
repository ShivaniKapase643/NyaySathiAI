/**
 * Tests for PII redaction.
 * Verifies redaction of Aadhaar, PAN, phone, email, UPI,
 * and absence of false positives on dates and other numbers.
 */
import { describe, it, expect } from "vitest";
import { redactPII } from "@/lib/security/redact";

describe("redactPII", () => {
  it("redacts a 12-digit Aadhaar number", () => {
    const { redacted, foundTypes } = redactPII("My Aadhaar is 123456789012.");
    expect(redacted).toContain("[AADHAAR_REDACTED]");
    expect(redacted).not.toContain("123456789012");
    expect(foundTypes).toContain("AADHAAR");
  });

  it("redacts spaced Aadhaar (XXXX XXXX XXXX)", () => {
    const { redacted } = redactPII("Aadhaar: 1234 5678 9012");
    expect(redacted).toContain("[AADHAAR_REDACTED]");
    expect(redacted).not.toContain("1234 5678 9012");
  });

  it("redacts a PAN card number", () => {
    const { redacted, foundTypes } = redactPII("PAN: ABCDE1234F is my ID");
    expect(redacted).toContain("[PAN_REDACTED]");
    expect(redacted).not.toContain("ABCDE1234F");
    expect(foundTypes).toContain("PAN");
  });

  it("redacts an Indian mobile number (10 digits starting with 6-9)", () => {
    const { redacted, foundTypes } = redactPII("Call me at 9876543210");
    expect(redacted).toContain("[PHONE_REDACTED]");
    expect(redacted).not.toContain("9876543210");
    expect(foundTypes).toContain("PHONE");
  });

  it("redacts an Indian mobile with +91 prefix", () => {
    const { redacted } = redactPII("Contact: +919876543210");
    expect(redacted).toContain("[PHONE_REDACTED]");
  });

  it("redacts an email address", () => {
    const { redacted, foundTypes } = redactPII("Email me at user@example.com");
    expect(redacted).toContain("[EMAIL_REDACTED]");
    expect(redacted).not.toContain("user@example.com");
    expect(foundTypes).toContain("EMAIL");
  });

  it("redacts a UPI ID", () => {
    const { redacted, foundTypes } = redactPII("My UPI is rahul.kumar@oksbi");
    expect(foundTypes).toContain("UPI");
  });

  it("does NOT redact a 4-digit year like 2024", () => {
    const { redacted } = redactPII("The RTI Act was passed in 2005");
    expect(redacted).toBe("The RTI Act was passed in 2005");
  });

  it("does NOT redact a date like 25-01-2024", () => {
    const { redacted } = redactPII("The deadline is 25-01-2024");
    expect(redacted).toBe("The deadline is 25-01-2024");
  });

  it("does NOT redact Rs. amounts", () => {
    const { redacted } = redactPII("Fee is Rs. 10 for RTI");
    expect(redacted).toBe("Fee is Rs. 10 for RTI");
  });

  it("redacts multiple PII types in one string", () => {
    const { redacted, foundTypes } = redactPII(
      "Name: John, Aadhaar: 1234 5678 9012, PAN: ABCDE1234F, Phone: 9876543210"
    );
    expect(redacted).not.toContain("1234 5678 9012");
    expect(redacted).not.toContain("ABCDE1234F");
    expect(redacted).not.toContain("9876543210");
    expect(foundTypes.length).toBeGreaterThanOrEqual(3);
  });

  it("returns original text unchanged when no PII present", () => {
    const text = "What is the RTI Act 2005 reply timeline?";
    const { redacted, foundTypes } = redactPII(text);
    expect(redacted).toBe(text);
    expect(foundTypes).toHaveLength(0);
  });
});
