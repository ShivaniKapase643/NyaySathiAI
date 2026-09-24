import legalAidData from "@/data/legal-aid.json";

export const metadata = {
  title: "Free Legal Help — NyayaSaathi",
  description: "Find NALSA helplines, State Legal Services Authorities, and free legal aid across India.",
};

interface LegalAidData {
  helplines: Array<{
    id: string;
    name: string;
    shortName: string;
    phone: string | null;
    description: string;
    url: string;
    last_verified: string;
    verified: boolean;
    notes?: string;
  }>;
  stateAuthorities: Array<{
    id: string;
    state: string;
    name: string;
    shortName: string;
    url: string;
    last_verified: string;
    verified: boolean;
  }>;
  consumerForums: {
    onlinePortal: {
      name: string;
      url: string;
      description: string;
      last_verified: string;
      verified: boolean;
    };
    nationalHelpline: {
      name: string;
      phone: string;
      phone_alt: string;
      url: string;
      last_verified: string;
      verified: boolean;
      notes?: string;
    };
  };
}

// Lawyer-need checklist items (rule-based, no LLM)
const CHECKLIST_ITEMS = [
  { id: "criminal", question: "Are you facing a criminal charge or police case?", urgency: "high", advice: "Yes — you should strongly consider getting a lawyer immediately. Criminal cases can have serious consequences." },
  { id: "court_date", question: "Do you have an upcoming court date?", urgency: "high", advice: "Yes — you need a lawyer before your court appearance." },
  { id: "property", question: "Does the dispute involve property or land worth significant money?", urgency: "high", advice: "Yes — property disputes are complex. A lawyer is strongly recommended." },
  { id: "large_money", question: "Is the amount at stake more than Rs. 1 lakh?", urgency: "medium", advice: "Consider a lawyer — the cost may be worth it for large amounts." },
  { id: "deadline", question: "Is there a legal deadline approaching (limitation period)?", urgency: "high", advice: "Yes — missing a legal deadline can permanently bar your claim. See a lawyer urgently." },
  { id: "employer", question: "Is the dispute with your employer about termination or wages?", urgency: "medium", advice: "A labour lawyer or free legal aid can advise on your employment rights." },
  { id: "family", question: "Does the matter involve divorce, child custody, or inheritance?", urgency: "medium", advice: "Family law matters benefit greatly from legal advice." },
];

const legalAid = legalAidData as unknown as LegalAidData;

export default function LegalAidPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Free Legal Help</h1>
        <p className="text-gray-600">
          All services listed here are free for eligible citizens. Verify contact details before use —
          this information is provided in good faith and may change.
        </p>
      </div>

      {/* NALSA Hero */}
      <section aria-labelledby="nalsa-heading" className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-6">
        <h2 id="nalsa-heading" className="text-2xl font-bold text-orange-800 mb-2">
          📞 NALSA Helpline: <a href="tel:15100" className="underline hover:no-underline" aria-label="Call NALSA at 15100">15100</a>
        </h2>
        <p className="text-orange-700 mb-3">
          Free legal advice, anywhere in India, in your language. Available to everyone.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="tel:15100"
            className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-colors"
            aria-label="Call NALSA helpline at 15100"
          >
            📞 Call 15100
          </a>
          <a
            href="https://nalsa.gov.in"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 border border-orange-400 text-orange-700 font-medium rounded-lg hover:bg-orange-50 transition-colors"
          >
            Visit nalsa.gov.in ↗
          </a>
        </div>
      </section>

      {/* Other helplines */}
      <section aria-labelledby="helplines-heading">
        <h2 id="helplines-heading" className="text-xl font-bold text-gray-800 mb-4">National Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {legalAid.helplines.slice(1).map((h) => (
            <div key={h.id} className="card space-y-2">
              <h3 className="font-bold text-gray-900">{h.name}</h3>
              {h.phone && (
                <p className="text-sm">
                  📞 <a href={`tel:${h.phone}`} className="text-orange-600 font-semibold hover:underline">{h.phone}</a>
                </p>
              )}
              <p className="text-sm text-gray-600">{h.description}</p>
              <a
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
                aria-label={`Visit ${h.name} website (opens in new tab)`}
              >
                {h.url} ↗
              </a>
              {!h.verified && (
                <p className="text-xs text-amber-600">⚠️ Verify contact details before use.</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Consumer forums */}
      <section aria-labelledby="consumer-heading">
        <h2 id="consumer-heading" className="text-xl font-bold text-gray-800 mb-4">Consumer Complaint</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card space-y-2">
            <h3 className="font-bold text-gray-900">{legalAid.consumerForums.onlinePortal.name}</h3>
            <p className="text-sm text-gray-600">{legalAid.consumerForums.onlinePortal.description}</p>
            <a href={legalAid.consumerForums.onlinePortal.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              {legalAid.consumerForums.onlinePortal.url} ↗
            </a>
          </div>
          <div className="card space-y-2">
            <h3 className="font-bold text-gray-900">{legalAid.consumerForums.nationalHelpline.name}</h3>
            <p className="text-sm">
              📞 <a href={`tel:${legalAid.consumerForums.nationalHelpline.phone}`} className="text-orange-600 font-semibold hover:underline">{legalAid.consumerForums.nationalHelpline.phone}</a>
              {" / "}
              <a href={`tel:${legalAid.consumerForums.nationalHelpline.phone_alt}`} className="text-orange-600 hover:underline">{legalAid.consumerForums.nationalHelpline.phone_alt}</a>
            </p>
            <a href={legalAid.consumerForums.nationalHelpline.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
              {legalAid.consumerForums.nationalHelpline.url} ↗
            </a>
          </div>
        </div>
      </section>

      {/* State authorities */}
      <section aria-labelledby="state-heading">
        <h2 id="state-heading" className="text-xl font-bold text-gray-800 mb-4">State Legal Services Authorities</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {legalAid.stateAuthorities.map((s) => (
            <div key={s.id} className="card p-4 space-y-1">
              <h3 className="font-semibold text-gray-900 text-sm">{s.state}</h3>
              <p className="text-xs text-gray-600">{s.name}</p>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                Visit website ↗
              </a>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Every district also has a District Legal Services Authority (DLSA). Find yours through your State authority.
        </p>
      </section>

      {/* Do I need a lawyer checklist */}
      <section aria-labelledby="checklist-heading" className="bg-gray-50 rounded-2xl p-6">
        <h2 id="checklist-heading" className="text-xl font-bold text-gray-800 mb-2">Do I Need a Lawyer?</h2>
        <p className="text-sm text-gray-600 mb-5">
          This checklist helps you assess whether your situation warrants professional legal help.
          It is rule-based guidance — not legal advice.
        </p>
        <ul className="space-y-3" role="list">
          {CHECKLIST_ITEMS.map((item) => (
            <li key={item.id} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-gray-200">
              <span
                className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                  item.urgency === "high" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"
                }`}
                aria-hidden="true"
              >
                {item.urgency === "high" ? "!" : "?"}
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{item.question}</p>
                <p className="text-xs text-gray-600 mt-0.5">→ {item.advice}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          <strong>Remember:</strong> If you answered &ldquo;yes&rdquo; to any high-priority item (marked !), strongly consider contacting NALSA (15100) or your nearest DLSA immediately.
        </div>
      </section>

      {/* Verification note */}
      <p role="note" className="text-xs text-gray-500 text-center pb-4">
        ⚠️ All contact details provided in good faith. Last verified: 2024. Please verify before use.
        If you find outdated information, please open an issue on our GitHub repository.
      </p>
    </div>
  );
}
