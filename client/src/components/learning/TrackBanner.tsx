import type { ReactNode } from 'react';

export type BannerTone = 'burnt' | 'red' | 'amber' | 'cream';

const wellCls: Record<BannerTone, string> = {
  burnt: 'bg-burnt text-cream shadow-lg shadow-burnt/20',
  red: 'bg-red-500 text-cream shadow-lg shadow-red-500/20',
  amber: 'bg-amber-500 text-noir shadow-lg shadow-amber-500/20',
  cream: 'bg-cream/15 text-cream shadow-lg shadow-cream/10',
};

/** Mockup CTA: solid burnt, uppercase, lifts on press. Shared by both pages. */
export const bannerCta =
  'mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-burnt px-8 py-4 text-sm font-bold uppercase tracking-wide text-cream shadow-lg shadow-burnt/20 transition-all hover:bg-burnt-dark active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/50';

interface TrackBannerProps {
  tone?: BannerTone;
  icon: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  progress?: { pct: number; label: string };
}

/**
 * Rich noir success/status banner from the mockup: burnt icon well,
 * extrabold heading, muted cream copy, decorative geometry, optional
 * progress row and a solid burnt CTA.
 */
export default function TrackBanner({ tone = 'burnt', icon, title, description, action, progress }: TrackBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-noir p-8 text-center text-cream shadow-2xl md:flex md:flex-row md:items-start md:justify-between md:gap-8 md:p-12 md:text-left">
      <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full border-[40px] border-burnt/10" aria-hidden="true" />
      <div className="pointer-events-none absolute right-20 top-10 h-4 w-4 rounded-full bg-burnt opacity-50" aria-hidden="true" />
      <div className="pointer-events-none absolute bottom-20 left-40 h-2 w-2 rounded-full bg-cream opacity-30" aria-hidden="true" />

      <div className="relative z-10 flex flex-1 flex-col items-center gap-4 md:items-start">
        <span className={`inline-flex items-center justify-center rounded-2xl p-3 ${wellCls[tone]}`}>{icon}</span>
        <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">{title}</h2>
        <p className="max-w-md text-lg font-medium text-cream/70">{description}</p>

        {progress && (
          <div className="mt-1 w-full max-w-md">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold">
              <span className="uppercase tracking-wider text-cream/70">Progress</span>
              <span className="text-burnt">{progress.label}</span>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-cream/20"
              role="progressbar"
              aria-valuenow={progress.pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-burnt transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, progress.pct))}%` }}
              />
            </div>
          </div>
        )}

        {action}
      </div>
    </div>
  );
}
