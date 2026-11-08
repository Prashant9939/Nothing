import type { ReactNode } from 'react';

/* Editorial bento building blocks — the shared visual language of the student
   portal redesign (warm cream canvas, 1px sand borders, burnt-orange accent,
   Space Grotesk display type, JetBrains Mono micro-labels).

   All styling lives in these three primitives so every card on the dashboard
   (and anything added later) stays on the same radius/shadow/type scale. */

/** Mono uppercase micro-label — the mockup's "TOTAL PLATFORM REVENUE" style. */
export function MicroLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`font-mono text-[11px] font-semibold uppercase tracking-[0.16em] ${className || 'text-charcoal'}`}>
      {children}
    </p>
  );
}

/** Standard alabaster card: 24px radius, sand border, bento hover lift. */
export function BentoCard({ label, title, action, className = '', children }: {
  label?: ReactNode;
  title?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const hasHeader = !!(label || title || action);
  return (
    <section
      className={`bento-card flex flex-col rounded-[24px] border border-sand bg-alabaster shadow-bento ${className}`}
    >
      {hasHeader && (
        <div className="flex items-start justify-between gap-3 px-6 pt-5">
          <div className="min-w-0">
            {label && <MicroLabel className="text-charcoal">{label}</MicroLabel>}
            {title && <h3 className="mt-1 font-display text-base font-semibold text-ink">{title}</h3>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={`min-w-0 flex-1 px-6 pb-6 ${hasHeader ? 'pt-4' : 'p-6'}`}>{children}</div>
    </section>
  );
}

/** Ink spotlight card: the #111 mesh texture with the burnt radial glow. */
export function InkCard({ className = '', children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={`noir-mesh relative overflow-hidden rounded-[24px] border border-noir text-cream shadow-ink-spotlight ${className}`}
    >
      {children}
    </section>
  );
}

/** Live status pill with the pulsing radar ring (real status text only). */
export function RadarPill({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-burnt/40 bg-burnt/20 px-2.5 py-1 font-mono text-[11px] font-semibold text-burnt ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-radar-ping absolute inline-flex h-full w-full rounded-full bg-burnt" aria-hidden="true" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-burnt" aria-hidden="true" />
      </span>
      {children}
    </span>
  );
}
