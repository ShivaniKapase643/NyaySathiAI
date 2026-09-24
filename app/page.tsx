import Link from "next/link";

export const metadata = {
  title: "NyayaSaathi — Free Legal Help for Every Indian",
  description:
    "Get cited legal answers in English, Hindi, or Marathi. Understand legal documents, draft RTI applications, and find free legal aid. Not a substitute for a lawyer.",
};

const features = [
  {
    href: "/qa",
    icon: "💬",
    titleKey: "Ask a Legal Question",
    desc: "Get answers about RTI, consumer rights, and tenancy — with citations from official Acts. Supports voice input and read-aloud.",
    color: "from-orange-50 to-orange-100 border-orange-200",
    cta: "Ask a question",
  },
  {
    href: "/simplify",
    icon: "📄",
    titleKey: "Simplify a Document",
    desc: "Paste or upload a legal document (.txt or .pdf) and get a plain-language summary, red-flag clauses, and next steps.",
    color: "from-green-50 to-green-100 border-green-200",
    cta: "Simplify a document",
  },
  {
    href: "/draft",
    icon: "✍️",
    titleKey: "Draft a Document",
    desc: "Step-by-step wizard to create an RTI application, consumer complaint, or legal notice. Download as PDF.",
    color: "from-blue-50 to-blue-100 border-blue-200",
    cta: "Start drafting",
  },
  {
    href: "/legal-aid",
    icon: "🤝",
    titleKey: "Free Legal Help",
    desc: "Find NALSA helplines, State Legal Services Authorities, and a checklist to decide if you need a lawyer.",
    color: "from-purple-50 to-purple-100 border-purple-200",
    cta: "Find legal help",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="text-center py-8">
        <h1
          id="hero-heading"
          className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4"
        >
          <span className="text-orange-500">न्याय</span>सा<span className="text-green-600">थी</span>
        </h1>
        <p className="text-xl font-semibold text-gray-700 mb-3">
          Legal Help in Your Language
        </p>
        <p className="text-base text-gray-600 max-w-2xl mx-auto mb-6">
          Understand your rights, simplify legal documents, and draft common applications —
          free, in English, Hindi, or Marathi. Powered by AI with citations from official Acts.
        </p>
        <div
          role="note"
          className="inline-block px-4 py-2 bg-green-50 border border-green-200 rounded-full text-sm text-green-800 font-medium"
        >
          🆓 NALSA Free Legal Help:{" "}
          <a
            href="tel:15100"
            className="font-bold underline hover:no-underline"
            aria-label="Call NALSA helpline at 15100"
          >
            Call 15100
          </a>
        </div>
      </section>

      {/* Features grid */}
      <section aria-labelledby="features-heading">
        <h2 id="features-heading" className="text-2xl font-bold text-gray-800 mb-6 text-center">
          What NyayaSaathi Can Help With
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map(({ href, icon, titleKey, desc, color, cta }) => (
            <article
              key={href}
              className={`border bg-gradient-to-br ${color} rounded-2xl p-6 flex flex-col gap-3 hover:shadow-md transition-shadow`}
            >
              <div className="text-4xl" aria-hidden="true">
                {icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900">{titleKey}</h3>
              <p className="text-sm text-gray-700 flex-1">{desc}</p>
              <Link
                href={href}
                className="self-start inline-flex items-center gap-1 px-4 py-2 bg-white border border-gray-300 text-gray-800 text-sm font-medium rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-colors"
                aria-label={`${cta} — ${titleKey}`}
              >
                {cta} →
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Coverage section */}
      <section aria-labelledby="coverage-heading" className="bg-gray-50 rounded-2xl p-6">
        <h2 id="coverage-heading" className="text-xl font-bold text-gray-800 mb-4">
          Topics Covered
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              title: "Right to Information Act, 2005",
              items: ["How to file an RTI", "30-day reply timeline", "Fees and exemptions", "First appeal process", "Exemptions from disclosure"],
            },
            {
              title: "Consumer Protection Act, 2019",
              items: ["Your 6 consumer rights", "Filing a complaint", "District/State/National forums", "2-year limitation period", "Unfair trade practices"],
            },
            {
              title: "Tenancy & Rental Law",
              items: ["Security deposit refund", "Rent agreement basics", "Eviction protections", "Notice periods", "State-wise variation noted"],
            },
          ].map(({ title, items }) => (
            <div key={title} className="bg-white rounded-xl p-4 border border-gray-200">
              <h3 className="font-semibold text-gray-800 mb-3 text-sm">{title}</h3>
              <ul className="space-y-1" role="list">
                {items.map((item) => (
                  <li key={item} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <span className="text-green-500 mt-0.5" aria-hidden="true">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-4">
          ⚠️ The legal corpus is provided in good faith from official government sources but has not been independently verified by a lawyer. Always cross-check important legal matters.
        </p>
      </section>

      {/* Language support */}
      <section aria-label="Language support" className="text-center">
        <p className="text-sm text-gray-600 mb-3 font-medium">Available in 3 languages</p>
        <div className="flex justify-center gap-4" role="list">
          {[
            { lang: "English", native: "English", code: "en" },
            { lang: "Hindi", native: "हिंदी", code: "hi" },
            { lang: "Marathi", native: "मराठी", code: "mr" },
          ].map(({ native, code }) => (
            <div
              key={code}
              className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700"
              role="listitem"
              lang={code === "en" ? "en" : `${code}-IN`}
            >
              {native}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
