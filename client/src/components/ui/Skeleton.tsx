export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-lg bg-slate-200/80 ${className}`}
    />
  );
}

// Page-shaped placeholder shown while a screen's data loads. Renders the
// layout immediately (header + cards) instead of a blank full-page spinner,
// so users perceive the page as present rather than "hanging".
export function PageSkeleton({ label = 'Loading...', className = '' }: { label?: string; className?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 ${className}`}
    >
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-56 max-w-full" />
      <Skeleton className="mt-3 h-4 w-80 max-w-full" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
      <div className="mt-6 space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}
