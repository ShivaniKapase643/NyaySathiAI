interface DisclaimerBannerProps {
  className?: string;
}

export function DisclaimerBanner({ className = "" }: DisclaimerBannerProps) {
  return (
    <div
      className={`bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm ${className}`}
      role="note"
      aria-label="Legal disclaimer"
    >
      <strong>⚠️ Disclaimer:</strong> NyayaSaathi provides general legal information
      only, not legal advice. For specific legal matters or court proceedings, always
      consult a qualified advocate. In emergencies, call Police: 100, NALSA: 15100.
    </div>
  );
}
