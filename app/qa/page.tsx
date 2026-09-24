"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Source {
  id: string;
  act: string;
  section: string;
  title: string;
  source_url: string;
  verified: boolean;
}

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

  const answerRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceSupported("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
    setSpeechSupported("speechSynthesis" in window);
  }, []);

  const handleVoiceInput = useCallback(() => {
    if (!voiceSupported) return;
    type SpeechRecognitionConstructor = new () => {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      onresult: ((e: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
      onerror: (() => void) | null;
      onend: (() => void) | null;
      start: () => void;
    };
    const win = window as unknown as Record<string, unknown>;
    const SpeechRecognition = (win.SpeechRecognition || win.webkitSpeechRecognition) as SpeechRecognitionConstructor;
    const recognition = new SpeechRecognition();
    const lang = document.documentElement.lang || "en-IN";
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = false;
    setIsListening(true);
    recognition.onresult = (e: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => {
      const transcript = e.results[0][0].transcript;
      setQuestion((q) => q + (q ? " " : "") + transcript);
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
    const lang = document.documentElement.lang || "en-IN";
    utterance.lang = lang;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [speechSupported, answer, isSpeaking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    setIsLoading(true);
    setIsStreaming(true);
    setAnswer("");
    setSources([]);
    setError("");
    setIsLowConfidence(false);
    setHasUnverified(false);
    setShowSources(false);

    // Announce to screen reader
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = "Finding answer, please wait...";
    }

    const lang = document.documentElement.lang?.slice(0, 2) || "en";
    const language = ["hi", "mr"].includes(lang) ? lang : "en";

    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim(), language }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Request failed");
      }

      const confidence = res.headers.get("X-Confidence");
      const unverified = res.headers.get("X-Unverified") === "true";
      const sourcesHeader = res.headers.get("X-Sources");

      setIsLowConfidence(confidence === "low");
      setHasUnverified(unverified);

      if (sourcesHeader) {
        try {
          setSources(JSON.parse(decodeURIComponent(sourcesHeader)) as Source[]);
        } catch {}
      }

      // Stream the response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response body");

      let fullAnswer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        fullAnswer += chunk;
        setAnswer(fullAnswer);
      }

      // Announce completion
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = "Answer ready. " + fullAnswer.slice(0, 100);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = "Error: " + msg;
      }
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const charCount = question.length;
  const charLimit = 1000;
  const isOverLimit = charCount > charLimit;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ARIA live region for screen readers */}
      <div
        ref={liveRegionRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="status"
      />

      <h1 className="text-3xl font-bold text-gray-900">Ask a Legal Question</h1>
      <p className="text-gray-600">
        Ask about RTI, consumer rights, or tenancy in English, Hindi, or Marathi.
        Answers are based only on the provided legal corpus with citations.
      </p>

      {/* Question form */}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="question-input" className="block text-sm font-semibold text-gray-700 mb-2">
            Your legal question
          </label>
          <div className="relative">
            <textarea
              id="question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="E.g.: How do I file an RTI application? What are my rights as a consumer? How do I get my security deposit back?"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base resize-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:outline-none"
              rows={4}
              maxLength={1100}
              aria-describedby="char-count question-help"
              aria-invalid={isOverLimit}
              aria-required="true"
              disabled={isLoading}
            />
          </div>
          <div className="flex justify-between items-center mt-1">
            <p id="question-help" className="text-xs text-gray-500">
              Type in English, Hindi, or Marathi
            </p>
            <p
              id="char-count"
              className={`text-xs ${isOverLimit ? "text-red-600 font-semibold" : "text-gray-500"}`}
              aria-live="polite"
            >
              {charCount}/{charLimit}
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
              aria-label={isListening ? "Listening for voice input..." : "Start voice input"}
              aria-pressed={isListening}
              className="px-4 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              🎤 {isListening ? "Listening..." : "Voice Input"}
            </button>
          )}

          {!voiceSupported && (
            <p className="text-xs text-gray-500 self-center" role="note">
              Voice input not available in this browser
            </p>
          )}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div role="alert" aria-live="assertive" className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Answer area */}
      {(answer || isStreaming) && (
        <section aria-labelledby="answer-heading" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 id="answer-heading" className="text-xl font-bold text-gray-900">Answer</h2>
            {speechSupported && answer && !isStreaming && (
              <button
                onClick={handleReadAloud}
                aria-label={isSpeaking ? "Stop reading answer aloud" : "Read answer aloud"}
                aria-pressed={isSpeaking}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isSpeaking ? "🔇 Stop" : "🔊 Read Aloud"}
              </button>
            )}
          </div>

          {/* Unverified corpus warning */}
          {hasUnverified && !isLowConfidence && (
            <div role="note" className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              ⚠️ Some sources in this answer are from our unverified corpus. The information may be accurate but has not been independently cross-checked against official government sources.
            </div>
          )}

          <div
            ref={answerRef}
            className={`p-5 bg-gray-50 rounded-xl border border-gray-200 text-gray-800 leading-relaxed whitespace-pre-wrap text-sm ${isStreaming ? "streaming-cursor" : ""}`}
            aria-live="polite"
            aria-busy={isStreaming}
            aria-label="Legal answer"
          >
            {answer || <span className="text-gray-400 italic">Searching legal sources...</span>}
          </div>

          {/* Sources */}
          {sources.length > 0 && !isLowConfidence && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowSources(!showSources)}
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
                          <span
                            className="shrink-0 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium"
                            title="This source has not been independently verified against official government text"
                          >
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
                            aria-label={`Official source: ${s.act}, ${s.section} (opens in new tab)`}
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
          )}
        </section>
      )}

      {/* Legal aid tip */}
      <aside className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm" aria-label="Free legal help">
        <p className="font-semibold text-green-800 mb-1">Need more help?</p>
        <p className="text-green-700">
          <strong>NALSA Free Legal Aid:</strong>{" "}
          <a href="tel:15100" className="font-bold underline" aria-label="Call NALSA at 15100">
            Call 15100
          </a>{" "}
          · Free legal advice anywhere in India.{" "}
          <a
            href="/legal-aid"
            className="underline hover:no-underline"
          >
            More options →
          </a>
        </p>
      </aside>
    </div>
  );
}
