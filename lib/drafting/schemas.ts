/**
 * Zod field schemas for all legal document templates.
 * Used for per-field validation in the draft wizard.
 */
import { z } from "zod";

export const RTIFieldsSchema = z.object({
  applicantName: z.string().min(2).max(100).trim(),
  applicantAddress: z.string().min(10).max(500).trim(),
  applicantPhone: z.string().max(15).optional(),
  publicAuthority: z.string().min(3).max(200).trim(),
  cpioDesignation: z.string().max(100).optional(),
  informationSought: z.string().min(10).max(1000).trim(),
  applicationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  feePaid: z.enum(["cash", "DD", "postal_order", "online", "BPL_exempt"]).default("cash"),
});
export type RTIFields = z.infer<typeof RTIFieldsSchema>;

export const ConsumerComplaintFieldsSchema = z.object({
  complainantName: z.string().min(2).max(100).trim(),
  complainantAddress: z.string().min(10).max(500).trim(),
  complainantPhone: z.string().max(15).optional(),
  oppositePartyName: z.string().min(2).max(200).trim(),
  oppositePartyAddress: z.string().min(10).max(500).trim(),
  productOrService: z.string().min(3).max(200).trim(),
  purchaseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  amountPaid: z.string().max(20).trim(),
  defectOrDeficiency: z.string().min(20).max(2000).trim(),
  reliefSought: z.string().min(10).max(500).trim(),
  filingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});
export type ConsumerComplaintFields = z.infer<typeof ConsumerComplaintFieldsSchema>;

export const LegalNoticeFieldsSchema = z.object({
  senderName: z.string().min(2).max(100).trim(),
  senderAddress: z.string().min(10).max(500).trim(),
  recipientName: z.string().min(2).max(100).trim(),
  recipientAddress: z.string().min(10).max(500).trim(),
  subject: z.string().min(5).max(200).trim(),
  depositAmount: z.string().max(20).trim(),
  vacatingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  noticePeriodDays: z.number().int().min(1).max(90).default(15),
  noticeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  additionalDetails: z.string().max(1000).optional(),
});
export type LegalNoticeFields = z.infer<typeof LegalNoticeFieldsSchema>;
