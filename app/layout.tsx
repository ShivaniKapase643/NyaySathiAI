"use client";

import "./globals.css";
import { Inter } from "next/font/google";
import { useState, useEffect } from "react";
import Link from "next/link";
import type { SupportedLocale } from "@/lib/i18n";
import { getStrings } from "@/lib/i18n";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/** Root layout — sets lang attribute dynamically on locale switch. */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<SupportedLocale>("en");
  const [fontScale, setFontScale] = useState(1);
  const [highContrast, setHighContrast] = useState(false);
  const t = getStrings(locale);

  // Persist preferences
  useEffect(() => {
    const saved = localStorage.getItem("nyayasaathi-prefs");
    if (saved) {
      try {
        const prefs = JSON.parse(saved) as { locale?: SupportedLocale; fontScale?: number; highContrast?: boolean };
        if (prefs.locale) setLocale(prefs.locale);
        if (prefs.fontScale) setFontScale(prefs.fontScale);
        if (prefs.highContrast !== undefined) setHighContrast(prefs.highContrast);
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "nyayasaathi-prefs",
      JSON.stringify({ locale, fontScale, highContrast })
    );
    // Update lang attribute for screen readers
    document.documentElement.lang =
      locale === "hi" ? "hi-IN" : locale === "mr" ? "mr-IN" : "en-IN";
    // Update font size
    document.documentElement.style.setProperty(
      "--font-size-multiplier",
      String(fontScale)
    );
  }, [locale, fontScale, highContrast]);

  return (
    <html
      lang="en-IN"
      className={`${inter.variable} ${highContrast ? "high-contrast" : ""}`}
      suppressHydrationWarning
    >
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#FF9933" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900">
        {/* Skip navigation link for keyboard users */}
        <a href="#main-content" className="skip-link">
          {t.common.skipToContent}
        </a>

        {/* Navigation */}
        <header role="banner" className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
          <nav
            className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between"
            role="navigation"
            aria-label="Main navigation"
          >
            <Link
              href="/"
              className="font-bold text-xl text-orange-500 hover:text-orange-600 focus-visible:outline-2"
              aria-label={`${t.appName} - Home`}
            >
              ⚖️ {t.appName}
            </Link>

            {/* Desktop nav links */}
            <ul className="hidden md:flex items-center gap-1 list-none" role="list">
              {[
                { href: "/qa", label: t.nav.qa },
                { href: "/simplify", label: t.nav.simplify },
                { href: "/draft", label: t.nav.draft },
                { href: "/legal-aid", label: t.nav.legalAid },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Accessibility controls */}
            <div className="flex items-center gap-2" role="toolbar" aria-label="Accessibility controls">
              {/* Language selector */}
              <label htmlFor="lang-select" className="sr-only">
                {t.common.language}
              </label>
              <select
                id="lang-select"
                value={locale}
                onChange={(e) => setLocale(e.target.value as SupportedLocale)}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1 bg-white focus-visible:outline-2"
                aria-label={`${t.common.language}: ${locale === "en" ? "English" : locale === "hi" ? "Hindi" : "Marathi"}`}
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="mr">मराठी</option>
              </select>

              {/* Font size controls */}
              <div className="flex items-center gap-1" role="group" aria-label={t.common.fontSize}>
                <button
                  onClick={() => setFontScale((s) => Math.max(0.75, s - 0.125))}
                  aria-label="Decrease font size"
                  className="w-7 h-7 text-xs font-bold border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
                  disabled={fontScale <= 0.75}
                >
                  A-
                </button>
                <button
                  onClick={() => setFontScale(1)}
                  aria-label="Reset font size"
                  className="w-7 h-7 text-sm font-bold border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
                >
                  A
                </button>
                <button
                  onClick={() => setFontScale((s) => Math.min(1.5, s + 0.125))}
                  aria-label="Increase font size"
                  className="w-7 h-7 text-lg font-bold border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center"
                  disabled={fontScale >= 1.5}
                >
                  A+
                </button>
              </div>

              {/* High contrast toggle */}
              <button
                onClick={() => setHighContrast((h) => !h)}
                aria-pressed={highContrast}
                aria-label={t.common.highContrast}
                className="w-8 h-8 border border-gray-300 rounded-md hover:bg-gray-100 flex items-center justify-center text-sm"
                title={t.common.highContrast}
              >
                ◑
              </button>
            </div>
          </nav>

          {/* Mobile nav */}
          <div className="md:hidden border-t border-gray-100 bg-gray-50">
            <ul className="flex gap-1 px-4 py-2 overflow-x-auto list-none" role="list">
              {[
                { href: "/qa", label: t.nav.qa },
                { href: "/simplify", label: t.nav.simplify },
                { href: "/draft", label: t.nav.draft },
                { href: "/legal-aid", label: t.nav.legalAid },
              ].map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="whitespace-nowrap px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-full hover:bg-orange-50 hover:text-orange-600 transition-colors"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </header>

        {/* Main content */}
        <main
          id="main-content"
          className="flex-1 max-w-6xl mx-auto w-full px-4 py-8"
          tabIndex={-1}
        >
          {/* Disclaimer banner */}
          <div
            role="note"
            className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
            aria-label="Important disclaimer"
          >
            ⚠️ {t.disclaimer}
          </div>
          {children}
        </main>

        {/* Footer */}
        <footer role="contentinfo" className="bg-gray-900 text-gray-300 py-8 mt-auto">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <h2 className="font-bold text-white mb-2">⚖️ {t.appName}</h2>
                <p className="text-sm">{t.tagline}</p>
                <p className="text-xs mt-2 text-gray-400">
                  Free, open-source. MIT License.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Free Legal Help</h3>
                <p className="text-sm">
                  <strong className="text-orange-400">NALSA:</strong> Call 15100
                  <br />
                  <a
                    href="https://nalsa.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-300 hover:underline"
                  >
                    nalsa.gov.in
                  </a>
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white mb-2">Disclaimer</h3>
                <p className="text-xs text-gray-400">
                  This tool provides general legal information only — not legal advice.
                  Always consult a qualified lawyer for your specific situation.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-700 pt-4 text-center text-xs text-gray-500">
              Built for the AI for Legal Assistance hackathon. Open-source on GitHub.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
