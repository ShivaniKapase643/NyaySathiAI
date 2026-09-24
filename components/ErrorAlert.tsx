interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div
      className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 flex items-start gap-2"
      role="alert"
      aria-live="assertive"
    >
      <span className="text-red-500 flex-shrink-0" aria-hidden="true">
        ⚠️
      </span>
      <p className="flex-1 text-sm">{message}</p>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 flex-shrink-0"
          aria-label="Dismiss error"
        >
          ×
        </button>
      )}
    </div>
  );
}
