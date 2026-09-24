/**
 * Tests for drafting templates — produce required fields, reject invalid input.
 */
import { describe, it, expect } from "vitest";
import { generateRTITemplate, generateConsumerComplaintTemplate, generateLegalNoticeTemplate } from "@/lib/drafting/templates";
import { RTIFieldsSchema, ConsumerComplaintFieldsSchema, LegalNoticeFieldsSchema } from "@/lib/drafting/schemas";

const validRTI = {
  applicantName: "Rahul Kumar",
  applicantAddress: "123 Main Street, Delhi 110001",
  publicAuthority: "Ministry of Health",
  informationSought: "Please provide the number of hospitals built in 2023.",
  applicationDate: "2024-01-15",
  feePaid: "cash" as const,
};

const validCC = {
  complainantName: "Priya Sharma",
  complainantAddress: "456 Park Avenue, Mumbai 400001",
  oppositePartyName: "XYZ Electronics Pvt Ltd",
  oppositePartyAddress: "789 Business Road, Mumbai 400002",
  productOrService: "Mobile Phone",
  purchaseDate: "2023-11-01",
  amountPaid: "15000",
  defectOrDeficiency: "The phone stopped working after 2 weeks of purchase. The screen went blank.",
  reliefSought: "Full refund of Rs. 15000 and compensation of Rs. 5000 for mental harassment.",
  filingDate: "2024-01-15",
};

const validLN = {
  senderName: "Amit Patel",
  senderAddress: "321 Garden Street, Pune 411001",
  recipientName: "Suresh Landlord",
  recipientAddress: "654 Owner Colony, Pune 411002",
  subject: "Recovery of Security Deposit",
  depositAmount: "50000",
  vacatingDate: "2024-01-01",
  noticeDate: "2024-01-15",
  noticePeriodDays: 15,
};

describe("generateRTITemplate", () => {
  it("generates a document with required content", () => {
    const { title, body } = generateRTITemplate(validRTI);
    expect(title).toBe("RTI Application");
    expect(body).toContain("Rahul Kumar");
    expect(body).toContain("Ministry of Health");
    expect(body).toContain("Right to Information Act, 2005");
    expect(body).toContain("Section 6");
    expect(body).toContain("DISCLAIMER");
  });

  it("includes BPL exemption text when feePaid is BPL_exempt", () => {
    const { body } = generateRTITemplate({ ...validRTI, feePaid: "BPL_exempt" });
    expect(body).toContain("Below Poverty Line");
    expect(body).toContain("exempt");
  });

  it("includes fee payment method when not BPL", () => {
    const { body } = generateRTITemplate({ ...validRTI, feePaid: "DD" });
    expect(body).toContain("DD");
  });

  it("includes NALSA helpline in disclaimer", () => {
    const { body } = generateRTITemplate(validRTI);
    expect(body).toContain("15100");
  });
});

describe("generateConsumerComplaintTemplate", () => {
  it("generates a document with required content", () => {
    const { title, body } = generateConsumerComplaintTemplate(validCC);
    expect(title).toBe("Consumer Complaint");
    expect(body).toContain("Priya Sharma");
    expect(body).toContain("XYZ Electronics");
    expect(body.toUpperCase()).toContain("CONSUMER PROTECTION ACT, 2019");
    expect(body).toContain("DISCLAIMER");
    expect(body).toContain("eDaakhil");
  });

  it("includes amount paid", () => {
    const { body } = generateConsumerComplaintTemplate(validCC);
    expect(body).toContain("15000");
  });
});

describe("generateLegalNoticeTemplate", () => {
  it("generates a document with required content", () => {
    const { title, body } = generateLegalNoticeTemplate(validLN);
    expect(title).toContain("Legal Notice");
    expect(body).toContain("Amit Patel");
    expect(body).toContain("Suresh Landlord");
    expect(body).toContain("50000");
    expect(body).toContain("DISCLAIMER");
  });

  it("includes the notice deadline date", () => {
    const { body } = generateLegalNoticeTemplate(validLN);
    // 15 days from 2024-01-15 = 2024-01-30
    expect(body).toContain("2024-01-30");
  });
});

describe("RTIFieldsSchema validation", () => {
  it("accepts valid RTI fields", () => {
    expect(RTIFieldsSchema.safeParse(validRTI).success).toBe(true);
  });

  it("rejects missing required field", () => {
    const { applicantName: _, ...withoutName } = validRTI;
    expect(RTIFieldsSchema.safeParse(withoutName).success).toBe(false);
  });

  it("rejects invalid date format", () => {
    expect(RTIFieldsSchema.safeParse({ ...validRTI, applicationDate: "15-01-2024" }).success).toBe(false);
  });
});

describe("LegalNoticeFieldsSchema validation", () => {
  it("accepts valid legal notice fields", () => {
    expect(LegalNoticeFieldsSchema.safeParse(validLN).success).toBe(true);
  });

  it("rejects noticePeriodDays out of range", () => {
    expect(LegalNoticeFieldsSchema.safeParse({ ...validLN, noticePeriodDays: 0 }).success).toBe(false);
    expect(LegalNoticeFieldsSchema.safeParse({ ...validLN, noticePeriodDays: 91 }).success).toBe(false);
  });
});
