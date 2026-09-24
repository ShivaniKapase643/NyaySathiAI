"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";

interface Source {
  id: string;
  act: string;
  section: string;
  title: string;
  source_url: string;
  verified: boolean;
}

// Buffer streamed tokens and flush every ~80ms so React doesn't re-render per token.
// This reduces render count from O(tokens) to O(tokens/batch) — ~10× fewer renders.
const STREAM_FLUSH_MS = 80;

export default function QAPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [isLowConfidence, setIsLowConfidence] = useState(false);
  const [hasUnverified, setHasUnverified] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [showSources, setShowSources] = useState(false);

  const liveRegionRef = useRef<HTMLDivElement>(null);
  // AbortController ref: cancel in-flight request when user re-submits or unmounts
  const abortRef = useRef<AbortController | null>(null);
  // Speech recognition ref: abort previous instance before starting a new one
  const recognitionRef = useRef<{ abort: () => void } | null>(null);

  useEffect(() => {
    setVoiceSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setSpeechSupported("speechSynthesis" in window);
    return () => {
      // Cancel any in-flight request on unmount
      abortRef.current?.abort();
      // Stop speech synthesis on unmount to avoid orphaned audio
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const handleVoiceInput = useCallback(() => {
    if (!voiceSupported) return;
    // Abort previous recognition instance before creating a new one
    recognitionRef.current?.abort();

    type SRConstructor = new () => {
      lang: string; continuous: boolean; interimResults: boolean;
      onresult: ((e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null; onend: (() => void) | null;
      start: () => void; abort: () => void;
    };
    const win = window as unknown as Record<string, unknown>;
    const SR = (win.SpeechRecognition || win.webkitSpeechRecognition) as SRConstructor;
    const recognition = new SR();
    recognition.lang = document.documentElement.lang || "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.onresult = (e) => {
      setQuestion((q) => q + (q ? " " : "") + e.results[0][0].transcript);
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  }, [voiceSupported]);

  const handleReadAloud = useCallback(() => {
    if (!speechSupported || !answer) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(answer.replace(/[⚠️🔗]/g, ""));
    utterance.lang = document.documentElement.lang || "en-IN";
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [speechSupported, answer, isSpeaking]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    // Cancel any previous in-flight request before starting a new one
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setIsLoading(true);
    setIsStreaming(true);
    setAnswer("");
    setSources([]);
    setError("");
    setIsLowConfidence(false);
    setHasUnverified(false);
    setShowSources(false);

    if (liveRegionRef.current) liveRegionRef.current.textContent = "Finding answer, please wait...";

    const lang = document.documentElement.lang?.slice(0, 2) || "en";
    const language = ["hi", "mr"].includes(lang) ? lang : "en";

    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), language }),
        signal: abort.signal, // AbortSignal: cancels fetch when user re-submits
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Request failed");
      }

      setIsLowConfidence(res.headers.get("X-Confidence") === "low");
      setHasUnverified(res.headers.get("X-Unverified") === "true");

      const sourcesHeader = res.headers.get("X-Sources");
      if (sourcesHeader) {
        try { setSources(JSON.parse(decodeURIComponent(sourcesHeader)) as Source[]); } catch { /* ignore */ }
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      // Buffered streaming: accumulate tokens and flush every STREAM_FLUSH_MS
      // Reduces React re-renders from O(tokens) → O(tokens / batch_size)
      let buffer = "";
      let fullAnswer = "";
      let rafId: number | null = null;

      const flush = () => {
        if (buffer) {
          fullAnswer += buffer;
          buffer = "";
          setAnswer(fullAnswer);
        }
        rafId = null;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) { flush(); break; }
        buffer += decoder.decode(value, { stream: true });
        if (rafId === null) {
          // Schedule a flush — batches tokens arriving within STREAM_FLUSH_MS
          rafId = window.setTimeout(flush, STREAM_FLUSH_MS);
        }
      }

      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = "Answer ready. " + fullAnswer.slice(0, 100);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // user cancelled — silent
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      if (liveRegionRef.current) liveRegionRef.current.textContent = "Error: " + msg;
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  }, [question, isLoading]);

  const charCount = question.length;
  const isOverLimit = charCount > 1000;

  // Memoise the sources list render to avoid re-rendering when other state changes
  const sourcesPanel = useMemo(() => (
    sources.length > 0 && !isLowConfidence ? (
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setShowSources((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700 transition-colors"
          aria-expanded={showSources}
          aria-controls="sources-list"
        >
          <span>📚 Sources ({sources.length})</span>
          <span aria-hidden="true">{showSources ? "▲" : "▼"}</span>
        </button>
        {showSources && (
          <ul id="sources-list" className="divide-y divide-gray-100" role="list">
            {sources.map((s) => (
              <li key={s.id} className="px-4 py-3 bg-white">
                <div className="flex items-start gap-2">
                  {!s.verified && (
                    <span className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                      Unverified
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{s.act}</p>
                    <p className="text-xs text-gray-500">{s.section} — {s.title}</p>
                    <a
                      href={s.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-orange-600 hover:underline mt-0.5 inline-block"
                    >
                      View official source ↗
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    ) : null
  ), [sources, isLowConfidence, showSources]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div ref={liveRegionRef} aria-live="polite" aria-atomic="true" className="sr-only" role="status" />

      <h1 className="text-3xl font-bold text-gray-900">Ask a Legal Question</h1>
      <p className="text-gray-600">
        Ask about RTI, consumer rights, or tenancy in English, Hindi, or Marathi.
        Answers are based only on the provided legal corpus with citations.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="question-input" className="block text-sm font-semibold text-gray-700 mb-2">
            Your legal question
          </label>
          <textarea
            id="question-input"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="E.g.: How do I file an RTI application? What are my rights as a consumer?"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base resize-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none"
            rows={4}
            maxLength={1100}
            aria-describedby="char-count question-help"
            aria-invalid={isOverLimit}
            aria-required="true"
            disabled={isLoading}
          />
          <div className="flex justify-between items-center mt-1">
            <p id="question-help" className="text-xs text-gray-500">Type in English, Hindi, or Marathi</p>
            <p id="char-count" className={`text-xs ${isOverLimit ? "text-red-600 font-semibold" : "text-gray-500"}`} aria-live="polite">
              {charCount}/1000
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isLoading || !question.trim() || isOverLimit}
            className="px-6 py-2.5 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            aria-busy={isLoading}
          >
            {isLoading ? "Searching..." : "Ask Question"}
          </button>
          {voiceSupported && (
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isListening || isLoading}
              aria-label={isListening ? "Listening..." : "Start voice input"}
              aria-pressed={isListening}
              className="px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              🎤 {isListening ? "Listening..." : "Voice Input"}
            </button>
          )}
        </div>
      </form>

      {error && (
        <div role="alert" aria-live="assertive" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {(answer || isStreaming) && (
        <section aria-labelledby="answer-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="answer-heading" className="text-xl font-bold text-gray-900">Answer</h2>
            {speechSupported && answer && !isStreaming && (
              <button
                onClick={handleReadAloud}
                aria-label={isSpeaking ? "Stop reading" : "Read answer aloud"}
                aria-pressed={isSpeaking}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isSpeaking ? "🔇 Stop" : "🔊 Read Aloud"}
              </button>
            )}
          </div>

          {hasUnverified && !isLowConfidence && (
            <div role="note" className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ⚠️ Some sources in this answer are from our unverified corpus.
            </div>
          )}

          <div
            className={`p-5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 leading-relaxed whitespace-pre-wrap text-sm ${isStreaming ? "streaming-cursor" : ""}`}
            aria-live="polite"
            aria-busy={isStreaming}
          >
            {answer || <span className="text-gray-400 italic">Searching legal sources...</span>}
          </div>

          {sourcesPanel}
        </section>
      )}

      <aside className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm" aria-label="Free legal help">
        <p className="font-semibold text-green-800 mb-1">Need more help?</p>
        <p className="text-green-700">
          <strong>NALSA Free Legal Aid:</strong>{" "}
          <a href="tel:15100" className="font-bold underline">Call 15100</a>
          {" · "}
          <a href="/legal-aid" className="underline hover:no-underline">More options →</a>
        </p>
      </aside>
    </div>
  );
}
