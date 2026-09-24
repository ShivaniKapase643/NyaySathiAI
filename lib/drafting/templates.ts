/**
 * Legal document templates.
 * Templates are deterministic -- the LLM only polishes language.
 * All facts come from user-provided fields only.
 */
import type { RTIFields, ConsumerComplaintFields, LegalNoticeFields } from "./schemas";

export interface TemplateResult {
  title: string;
  body: string;
}

/**
 * Generates an RTI application template.
 */
export function generateRTITemplate(fields: RTIFields): TemplateResult {
  const feeText =
    fields.feePaid === "BPL_exempt"
      ? "I am a Below Poverty Line (BPL) cardholder and am therefore exempt from paying the prescribed fee."
      : "I am enclosing the prescribed application fee of Rs. 10 by " + fields.feePaid + ".";

  const cpioLine = fields.cpioDesignation ? fields.cpioDesignation + "\n" : "";
  const phoneLine = fields.applicantPhone ? "\nPhone: " + fields.applicantPhone : "";

  const body =
    "To,\n" +
    "The Central/State Public Information Officer\n" +
    fields.publicAuthority + "\n" +
    cpioLine +
    "\nSubject: Request for Information under the Right to Information Act, 2005\n\n" +
    "Respected Sir/Madam,\n\n" +
    "I, " + fields.applicantName + ", residing at " + fields.applicantAddress +
    ", wish to seek the following information under Section 6 of the Right to Information Act, 2005:\n\n" +
    "INFORMATION REQUESTED:\n" +
    fields.informationSought + "\n\n" +
    feeText + "\n\n" +
    "I would like to receive this information in writing. If the requested information is not available " +
    "with your office, please transfer this application to the appropriate Public Information Officer " +
    "under Section 6(3) of the RTI Act.\n\n" +
    "Date: " + fields.applicationDate + "\n\n" +
    "Yours faithfully,\n" +
    fields.applicantName + "\n" +
    fields.applicantAddress +
    phoneLine + "\n\n" +
    "---\n" +
    "DISCLAIMER: This RTI application has been generated for informational purposes. " +
    "Please review it with a lawyer or legal aid provider before submitting. " +
    "The applicant is solely responsible for the accuracy of the information provided.\n" +
    "Free legal help: NALSA Helpline 15100 | eDaakhil: edaakhil.nic.in";

  return { title: "RTI Application", body };
}

/**
 * Generates a consumer complaint template.
 */
export function generateConsumerComplaintTemplate(fields: ConsumerComplaintFields): TemplateResult {
  const phoneLine = fields.complainantPhone ? "\nPhone: " + fields.complainantPhone : "";

  const body =
    "BEFORE THE DISTRICT CONSUMER DISPUTES REDRESSAL COMMISSION\n\n" +
    "Complaint No.: _______________ (to be filled by the Commission)\n" +
    "Date: " + fields.filingDate + "\n\n" +
    "IN THE MATTER OF:\n\n" +
    fields.complainantName + "\n" +
    fields.complainantAddress +
    phoneLine + "\n" +
    "                                          ...Complainant\n\n" +
    "VERSUS\n\n" +
    fields.oppositePartyName + "\n" +
    fields.oppositePartyAddress + "\n" +
    "                                          ...Opposite Party\n\n" +
    "CONSUMER COMPLAINT UNDER SECTION 35 OF THE CONSUMER PROTECTION ACT, 2019\n\n" +
    "FACTS OF THE COMPLAINT:\n\n" +
    '1. The Complainant purchased/availed "' + fields.productOrService +
    '" from the Opposite Party on ' + fields.purchaseDate +
    " for a consideration of Rs. " + fields.amountPaid + ".\n\n" +
    "2. DEFECT / DEFICIENCY:\n" + fields.defectOrDeficiency + "\n\n" +
    "3. RELIEF SOUGHT:\n" +
    "The Complainant respectfully prays that this Hon'ble Commission may be pleased to:\n" +
    fields.reliefSought + "\nAlso award costs of litigation.\n\n" +
    "DECLARATION:\n" +
    "I, " + fields.complainantName + ", do hereby declare that the facts stated above are true and correct " +
    "to the best of my knowledge and belief.\n\n" +
    "Date: " + fields.filingDate + "\n" +
    "Place: _______________\n\n" +
    "Signature: _______________\n" +
    fields.complainantName + "\n" +
    "Complainant\n\n" +
    "---\n" +
    "DISCLAIMER: This draft complaint is for informational purposes only. Please review with a lawyer or " +
    "legal aid provider before filing.\n" +
    "Free help: NALSA 15100 | eDaakhil: edaakhil.nic.in | National Consumer Helpline: 1800-11-4000";

  return { title: "Consumer Complaint", body };
}

/**
 * Generates a legal notice for security deposit recovery.
 */
export function generateLegalNoticeTemplate(fields: LegalNoticeFields): TemplateResult {
  const deadlineDate = new Date(fields.noticeDate);
  deadlineDate.setDate(deadlineDate.getDate() + fields.noticePeriodDays);
  const deadline = deadlineDate.toISOString().split("T")[0];

  const additionalSection = fields.additionalDetails
    ? "3. ADDITIONAL DETAILS:\n" + fields.additionalDetails + "\n\n"
    : "";

  const body =
    "LEGAL NOTICE\n\n" +
    "Date: " + fields.noticeDate + "\n\n" +
    "To,\n" +
    fields.recipientName + "\n" +
    fields.recipientAddress + "\n\n" +
    "Subject: " + fields.subject + "\n\n" +
    "Sir/Madam,\n\n" +
    "UNDER INSTRUCTIONS FROM AND ON BEHALF OF MY CLIENT " +
    fields.senderName.toUpperCase() + ", RESIDING AT " +
    fields.senderAddress.toUpperCase() +
    ", I HEREBY SERVE UPON YOU THE FOLLOWING LEGAL NOTICE:\n\n" +
    "1. My client vacated the premises at " + fields.recipientAddress +
    " on " + fields.vacatingDate +
    ", having previously paid a security deposit of Rs. " + fields.depositAmount + ".\n\n" +
    "2. Despite my client fulfilling all obligations as a tenant and vacating the premises, " +
    "you have failed and neglected to refund the said security deposit of Rs. " +
    fields.depositAmount + " without any valid legal reason.\n\n" +
    additionalSection +
    "You are hereby called upon to refund the entire security deposit of Rs. " +
    fields.depositAmount + " to my client within " + fields.noticePeriodDays +
    " days from the date of receipt of this notice, i.e., on or before " + deadline + ".\n\n" +
    "PLEASE TAKE NOTICE that if you fail to comply with the above demand within the stipulated time, " +
    "my client shall be constrained to initiate appropriate legal proceedings before the competent " +
    "court/authority, at your risk and cost, without any further notice.\n\n" +
    "Yours faithfully,\n\n" +
    fields.senderName + "\n" +
    fields.senderAddress + "\n\n" +
    "---\n" +
    "DISCLAIMER: This legal notice draft is for informational purposes only. " +
    "Please review with a qualified lawyer before sending.\n" +
    "Free legal help: NALSA Helpline 15100";

  return { title: "Legal Notice -- Security Deposit Recovery", body };
}
