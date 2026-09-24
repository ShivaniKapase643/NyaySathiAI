"use client";

import { useState } from "react";

type TemplateId = "rti" | "consumer_complaint" | "legal_notice";
type Step = "select" | "fields" | "preview";

interface DraftResult {
  title: string;
  body: string;
  warning?: string;
}

// RTI form fields definition
const RTI_FIELDS = [
  { key: "applicantName", label: "Your Full Name", type: "text", required: true, placeholder: "e.g. Rahul Kumar" },
  { key: "applicantAddress", label: "Your Address", type: "textarea", required: true, placeholder: "Full postal address" },
  { key: "applicantPhone", label: "Phone Number (optional)", type: "tel", required: false, placeholder: "10-digit mobile number" },
  { key: "publicAuthority", label: "Name of Public Authority", type: "text", required: true, placeholder: "e.g. Ministry of Health and Family Welfare" },
  { key: "cpioDesignation", label: "CPIO Designation (optional)", type: "text", required: false, placeholder: "e.g. Under Secretary" },
  { key: "informationSought", label: "Information You Want", type: "textarea", required: true, placeholder: "Describe clearly what information you are seeking" },
  { key: "applicationDate", label: "Date of Application", type: "date", required: true, placeholder: "" },
  { key: "feePaid", label: "Fee Payment Method", type: "select", required: true, options: [
    { value: "cash", label: "Cash" },
    { value: "DD", label: "Demand Draft" },
    { value: "postal_order", label: "Postal Order" },
    { value: "online", label: "Online Payment" },
    { value: "BPL_exempt", label: "BPL Card (Exempt)" },
  ]},
];

const CC_FIELDS = [
  { key: "complainantName", label: "Your Full Name", type: "text", required: true, placeholder: "e.g. Priya Sharma" },
  { key: "complainantAddress", label: "Your Address", type: "textarea", required: true, placeholder: "Full postal address" },
  { key: "complainantPhone", label: "Phone Number (optional)", type: "tel", required: false, placeholder: "10-digit mobile number" },
  { key: "oppositePartyName", label: "Company / Seller Name", type: "text", required: true, placeholder: "Name of the business you are complaining against" },
  { key: "oppositePartyAddress", label: "Company / Seller Address", type: "textarea", required: true, placeholder: "Registered address of the opposite party" },
  { key: "productOrService", label: "Product or Service", type: "text", required: true, placeholder: "e.g. Mobile phone, Insurance policy" },
  { key: "purchaseDate", label: "Date of Purchase/Service", type: "date", required: true, placeholder: "" },
  { key: "amountPaid", label: "Amount Paid (Rs.)", type: "text", required: true, placeholder: "e.g. 15000" },
  { key: "defectOrDeficiency", label: "Describe the Problem", type: "textarea", required: true, placeholder: "Clearly describe the defect or poor service" },
  { key: "reliefSought", label: "What Relief Do You Want?", type: "textarea", required: true, placeholder: "e.g. Full refund of Rs. 15000 and compensation of Rs. 5000 for harassment" },
  { key: "filingDate", label: "Date of Filing", type: "date", required: true, placeholder: "" },
];

const LN_FIELDS = [
  { key: "senderName", label: "Your Full Name", type: "text", required: true, placeholder: "Your name" },
  { key: "senderAddress", label: "Your Address", type: "textarea", required: true, placeholder: "Your full address" },
  { key: "recipientName", label: "Landlord Name", type: "text", required: true, placeholder: "Landlord full name" },
  { key: "recipientAddress", label: "Landlord Address", type: "textarea", required: true, placeholder: "Landlord address" },
  { key: "subject", label: "Subject", type: "text", required: true, placeholder: "e.g. Recovery of Security Deposit" },
  { key: "depositAmount", label: "Deposit Amount (Rs.)", type: "text", required: true, placeholder: "e.g. 50000" },
  { key: "vacatingDate", label: "Date You Vacated", type: "date", required: true, placeholder: "" },
  { key: "noticeDate", label: "Date of This Notice", type: "date", required: true, placeholder: "" },
  { key: "noticePeriodDays", label: "Reply Period (days)", type: "number", required: true, placeholder: "15" },
  { key: "additionalDetails", label: "Additional Details (optional)", type: "textarea", required: false, placeholder: "Any other relevant facts" },
];

const TEMPLATES = [
  { id: "rti" as TemplateId, label: "RTI Application", icon: "📋", desc: "Request information from any government body under the Right to Information Act, 2005.", fields: RTI_FIELDS },
  { id: "consumer_complaint" as TemplateId, label: "Consumer Complaint", icon: "🛒", desc: "File a complaint before the Consumer Disputes Redressal Commission under the Consumer Protection Act, 2019.", fields: CC_FIELDS },
  { id: "legal_notice" as TemplateId, label: "Legal Notice — Security Deposit", icon: "📬", desc: "Send a formal legal notice to your landlord demanding return of security deposit.", fields: LN_FIELDS },
];

export default function DraftPage() {
  const [step, setStep] = useState<Step>("select");
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DraftResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const selectedTemplate = TEMPLATES.find((t) => t.id === templateId);

  const handleSelect = (id: TemplateId) => {
    setTemplateId(id);
    setFormData({});
    setValidationErrors({});
    setStep("fields");
    setResult(null);
  };

  const validateFields = () => {
    if (!selectedTemplate) return false;
    const errors: Record<string, string> = {};
    for (const field of selectedTemplate.fields) {
      if (field.required && !formData[field.key]?.trim()) {
        errors[field.key] = `${field.label} is required`;
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleGenerate = async () => {
    if (!templateId || !validateFields()) return;

    setIsLoading(true);
    setError("");
    setResult(null);

    const lang = document.documentElement.lang?.slice(0, 2) || "en";
    const language = ["hi", "mr"].includes(lang) ? lang : "en";

    // Convert noticePeriodDays to number
    const processedFields = { ...formData };
    if (templateId === "legal_notice" && formData.noticePeriodDays) {
      processedFields.noticePeriodDays = formData.noticePeriodDays;
    }

    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          fields: processedFields,
          language,
        }),
      });

      const data = await res.json() as DraftResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate draft");
      setResult(data);
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Draft a Legal Document</h1>

      {/* Step indicator */}
      <nav aria-label="Draft progress" className="flex items-center gap-2 text-sm">
        {[
          { s: "select", label: "1. Choose type" },
          { s: "fields", label: "2. Fill details" },
          { s: "preview", label: "3. Preview & download" },
        ].map(({ s, label }, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-400" aria-hidden="true">→</span>}
            <span
              className={`font-medium ${step === s ? "text-orange-600" : step === "preview" && i < 2 ? "text-green-600" : "text-gray-400"}`}
              aria-current={step === s ? "step" : undefined}
            >
              {label}
            </span>
          </div>
        ))}
      </nav>

      {/* Step 1: Select template */}
      {step === "select" && (
        <section aria-labelledby="select-heading">
          <h2 id="select-heading" className="text-xl font-bold text-gray-800 mb-4">Choose Document Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className="text-left p-5 border-2 border-gray-200 rounded-2xl hover:border-orange-400 hover:bg-orange-50 transition-all group"
                aria-describedby={`${t.id}-desc`}
              >
                <div className="text-3xl mb-3" aria-hidden="true">{t.icon}</div>
                <h3 className="font-bold text-gray-900 mb-1 group-hover:text-orange-700">{t.label}</h3>
                <p id={`${t.id}-desc`} className="text-xs text-gray-600">{t.desc}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Step 2: Fill fields */}
      {step === "fields" && selectedTemplate && (
        <section aria-labelledby="fields-heading">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setStep("select")}
              className="text-sm text-gray-600 hover:text-orange-600 underline"
              aria-label="Back to template selection"
            >
              ← Back
            </button>
            <h2 id="fields-heading" className="text-xl font-bold text-gray-800">
              {selectedTemplate.icon} {selectedTemplate.label}
            </h2>
          </div>

          <div className="space-y-4">
            {selectedTemplate.fields.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`field-${field.key}`}
                  className="block text-sm font-semibold text-gray-700 mb-1"
                >
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
                </label>

                {field.type === "textarea" ? (
                  <textarea
                    id={`field-${field.key}`}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    rows={3}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none ${validationErrors[field.key] ? "border-red-400" : "border-gray-300"}`}
                    aria-required={field.required}
                    aria-describedby={validationErrors[field.key] ? `${field.key}-error` : undefined}
                    aria-invalid={!!validationErrors[field.key]}
                  />
                ) : field.type === "select" ? (
                  <select
                    id={`field-${field.key}`}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    className={`w-full rounded-lg border px-3 py-2 text-sm bg-white focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none ${validationErrors[field.key] ? "border-red-400" : "border-gray-300"}`}
                    aria-required={field.required}
                  >
                    <option value="">Select...</option>
                    {((field as { options?: { value: string; label: string }[] }).options ?? []).map((opt: { value: string; label: string }) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    id={`field-${field.key}`}
                    value={formData[field.key] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none ${validationErrors[field.key] ? "border-red-400" : "border-gray-300"}`}
                    aria-required={field.required}
                    aria-describedby={validationErrors[field.key] ? `${field.key}-error` : undefined}
                    aria-invalid={!!validationErrors[field.key]}
                  />
                )}

                {validationErrors[field.key] && (
                  <p id={`${field.key}-error`} role="alert" className="text-xs text-red-600 mt-1">
                    {validationErrors[field.key]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div role="alert" className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className="mt-6 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 transition-colors"
            aria-busy={isLoading}
          >
            {isLoading ? "Generating..." : "Generate Document →"}
          </button>
        </section>
      )}

      {/* Step 3: Preview */}
      {step === "preview" && result && (
        <section aria-labelledby="preview-heading">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setStep("fields")}
              className="text-sm text-gray-600 hover:text-orange-600 underline"
            >
              ← Edit
            </button>
            <h2 id="preview-heading" className="text-xl font-bold text-gray-800">{result.title}</h2>
          </div>

          {result.warning && (
            <div role="note" className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ⚠️ {result.warning}
            </div>
          )}

          {/* Document preview */}
          <div
            className="p-6 bg-white border-2 border-gray-200 rounded-xl print-content font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-800 max-h-[60vh] overflow-y-auto"
            aria-label="Generated document preview"
          >
            {result.body}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 mt-4 no-print">
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors"
              aria-label={copied ? "Text copied to clipboard" : "Copy document text to clipboard"}
            >
              {copied ? "✅ Copied!" : "📋 Copy Text"}
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium transition-colors"
              aria-label="Print or save as PDF"
            >
              🖨️ Print / Save PDF
            </button>
          </div>

          {/* Disclaimer */}
          <div role="note" className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            ⚠️ This draft is for general guidance only. Please review it with a qualified lawyer or legal aid provider before using. NALSA free legal help: <strong>15100</strong>
          </div>
        </section>
      )}
    </div>
  );
}
