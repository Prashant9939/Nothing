import type { ReactNode } from 'react';

interface TrackStatProps {
  icon: ReactNode;
  value: ReactNode;
  label: string;
  /** `burnt` renders the highlighted third card from the mockup. */
  tone?: 'neutral' | 'burnt';
}

/** Mockup stat card: border-2 rounded-3xl, icon well, extrabold value,
    uppercase micro-label. Real data only — callers pass the numbers. */
export default function TrackStat({ icon, value, label, tone = 'neutral' }: TrackStatProps) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-3xl border-2 p-6 ${
        tone === 'burnt' ? 'border-burnt/20 bg-burnt/10' : 'border-noir/10'
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${
          tone === 'burnt' ? 'bg-burnt/20 text-burnt' : 'bg-noir/5 text-noir'
        }`}
      >
        {icon}
      </div>
      <div>
        <div className={`font-display text-3xl font-bold ${tone === 'burnt' ? 'text-burnt' : 'text-noir'}`}>
          {value}
        </div>
        <div className={`mt-1 text-sm font-bold uppercase tracking-widest ${tone === 'burnt' ? 'text-burnt/70' : 'text-noir/50'}`}>
          {label}
        </div>
      </div>
    </div>
  );
}
