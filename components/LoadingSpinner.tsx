interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: string;
  label?: string;
}

export function LoadingSpinner({
  size = "md",
  color = "border-orange-500",
  label = "Loading...",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-3",
  };

  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex items-center gap-2"
    >
      <span
        className={`${sizeClasses[size]} border-slate-200 ${color} border-t-transparent rounded-full animate-spin`}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
