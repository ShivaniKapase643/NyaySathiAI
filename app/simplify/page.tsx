"use client";

import { useState, useRef } from "react";

interface RedFlag {
  clause: string;
  risk: string;
}

interface SimplifyResult {
  summary: string;
  documentType: string;
  keyParties: string[];
  keyDates: string[];
  deadlines: string[];
  redFlags: RedFlag[];
  nextSteps: string[];
  disclaimer?: string;
}

const MAX_SIZE = 2 * 1024 * 1024;
const MAX_CHARS = 15_000;

/**
 * Extracts plain text from a PDF file using pdfjs-dist (loaded dynamically).
 * Uses the legacy build with a fake worker to avoid CDN/bundler issues on Vercel.
 */
async function extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
  // Use the legacy build — it runs entirely in the main thread, no worker needed.
  // This avoids all CDN/bundler worker URL issues on Vercel and other platforms.
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "";

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    fullText += pageText + "\n";
    if (fullText.length >= MAX_CHARS) break;
  }

  return fullText.trim().slice(0, MAX_CHARS);
}

export default function SimplifyPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<SimplifyResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const liveRef = useRef<HTMLDivElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_SIZE) {
      setError("File is too large. Maximum size is 2 MB.");
      return;
    }
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (![".txt", ".pdf"].includes(ext)) {
      setError("Only .txt and .pdf files are supported.");
      return;
    }

    setFilename(file.name);
    setError("");
    setText("");

    if (ext === ".txt") {
      const txt = await file.text();
      setText(txt.slice(0, MAX_CHARS));
    } else {
      // PDF: use pdfjs-dist for proper text extraction
      setIsParsing(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const extracted = await extractTextFromPDF(arrayBuffer);
        if (extracted.trim().length < 20) {
          setError("Could not extract text from this PDF. It may be a scanned image. Please copy-paste the text manually.");
          setText("");
        } else {
          setText(extracted);
        }
      } catch (err) {
        setError("Failed to read PDF. Please try copy-pasting the text instead.");
        console.error("PDF extraction error:", err);
      } finally {
        setIsParsing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;

    setIsLoading(true);
    setResult(null);
    setError("");

    if (liveRef.current) liveRef.current.textContent = "Analysing document, please wait...";

    const lang = document.documentElement.lang?.slice(0, 2) || "en";
    const language = ["hi", "mr"].includes(lang) ? lang : "en";

    try {
      const res = await fetch("/api/simplify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.slice(0, MAX_CHARS), language, filename }),
      });

      const data = await res.json() as SimplifyResult & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setResult(data);
      if (liveRef.current) liveRef.current.textContent = "Document analysis complete.";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      if (liveRef.current) liveRef.current.textContent = "Error: " + msg;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div ref={liveRef} aria-live="polite" aria-atomic="true" className="sr-only" role="status" />

      <h1 className="text-3xl font-bold text-gray-900">Simplify a Legal Document</h1>
      <p className="text-gray-600">
        Paste document text or upload a .txt/.pdf file (max 2 MB, 15,000 characters).
        Get a plain-language summary with red-flag clauses and next steps.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* File upload */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Upload file (optional)
          </label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center hover:border-orange-400 transition-colors cursor-pointer"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Click or drag to upload a .txt or .pdf file"
            onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".txt,.pdf"
              className="sr-only"
              aria-label="Upload document file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <p className="text-sm text-gray-500">
              📎 {isParsing ? "Extracting text from PDF..." : filename || "Click to upload or drag & drop (.txt or .pdf, max 2 MB)"}
            </p>
          </div>
        </div>

        {/* Text area */}
        <div>
          <label htmlFor="doc-text" className="block text-sm font-semibold text-gray-700 mb-2">
            Or paste document text
          </label>
          <textarea
            id="doc-text"
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
            placeholder="Paste the legal document text here..."
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm resize-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none"
            rows={8}
            aria-describedby="char-count-doc"
            disabled={isLoading}
          />
          <p id="char-count-doc" className="text-xs text-gray-500 mt-1 text-right" aria-live="polite">
            {text.length}/{MAX_CHARS} characters
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading || isParsing || !text.trim()}
          className="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-busy={isLoading || isParsing}
        >
          {isParsing ? "Reading PDF..." : isLoading ? "Analysing..." : "Simplify Document"}
        </button>
      </form>

      {error && (
        <div role="alert" aria-live="assertive" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <section aria-labelledby="result-heading" className="space-y-5">
          <h2 id="result-heading" className="text-2xl font-bold text-gray-900">Document Analysis</h2>

          {/* Document type badge */}
          {result.documentType && (
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {result.documentType}
            </span>
          )}

          {/* Summary */}
          <div className="card">
            <h3 className="font-bold text-gray-800 mb-2">📋 Summary</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{result.summary}</p>
          </div>

          {/* Key parties */}
          {result.keyParties.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-2">👥 Key Parties</h3>
              <ul className="space-y-1" role="list">
                {result.keyParties.map((p, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5" aria-hidden="true">•</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Key dates & deadlines */}
          {(result.keyDates.length > 0 || result.deadlines.length > 0) && (
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-2">📅 Dates & Deadlines</h3>
              {result.keyDates.map((d, i) => (
                <p key={i} className="text-sm text-gray-700">📅 {d}</p>
              ))}
              {result.deadlines.map((d, i) => (
                <p key={i} className="text-sm text-red-700 font-medium">⏰ {d}</p>
              ))}
            </div>
          )}

          {/* Red flags */}
          {result.redFlags.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-gray-800">🚩 Red Flags</h3>
              {result.redFlags.map((rf, i) => (
                <div key={i} className="red-flag-box" role="note" aria-label={`Red flag: ${rf.clause}`}>
                  <p className="text-sm font-semibold text-red-800 mb-1">{rf.clause}</p>
                  <p className="text-sm text-red-700">⚠️ {rf.risk}</p>
                </div>
              ))}
            </div>
          )}

          {/* Next steps */}
          {result.nextSteps.length > 0 && (
            <div className="card">
              <h3 className="font-bold text-gray-800 mb-2">✅ What to Do Next</h3>
              <ol className="space-y-2 list-none">
                {result.nextSteps.map((s, i) => (
                  <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                    <span className="shrink-0 w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-xs font-bold" aria-hidden="true">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Disclaimer */}
          <div role="note" className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            ⚠️ {result.disclaimer || "This is a simplified explanation for general information only. It is not legal advice. Please consult a qualified lawyer before taking action."}
          </div>
        </section>
      )}
    </div>
  );
}
