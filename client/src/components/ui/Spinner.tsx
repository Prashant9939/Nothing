export function Spinner({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-slate-200 border-t-slate-900 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

export function PageLoader({ label, className = '' }: { label?: string; className?: string }) {
  return (
    <div className={`flex h-[60vh] flex-col items-center justify-center gap-3 ${className}`} role="status" aria-live="polite">
      <Spinner />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}

export function InlineSpinner({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white ${className}`}
    />
  );
}
