"use client";

type Language = "en" | "hi" | "mr";

interface LanguageSelectorProps {
  value: Language;
  onChange: (lang: Language) => void;
  activeColor?: string;
  label?: string;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
};

export function LanguageSelector({
  value,
  onChange,
  activeColor = "bg-orange-500",
  label = "Language",
}: LanguageSelectorProps) {
  return (
    <fieldset className="flex gap-1 items-center">
      <legend className="sr-only">{label}</legend>
      {(["en", "hi", "mr"] as const).map((lang) => (
        <label key={lang} className="cursor-pointer">
          <input
            type="radio"
            name="language-selector"
            value={lang}
            checked={value === lang}
            onChange={() => onChange(lang)}
            className="sr-only"
          />
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              value === lang
                ? `${activeColor} text-white`
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {LANGUAGE_LABELS[lang]}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
