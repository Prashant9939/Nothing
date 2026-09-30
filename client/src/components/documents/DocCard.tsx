import { useState, type ReactNode } from 'react';
import { Download, Lock } from 'lucide-react';
import { InlineSpinner } from '../ui';

type Tone = 'sky' | 'slate' | 'violet' | 'amber';

const toneClasses: Record<Tone, string> = {
  sky: 'border-sky-100 bg-sky-50 text-sky-600',
  slate: 'border-slate-200 bg-slate-100 text-slate-600',
  violet: 'border-violet-100 bg-violet-50 text-violet-600',
  amber: 'border-amber-100 bg-amber-50 text-amber-600',
};

interface DocCardProps {
  icon: ReactNode;
  tone?: Tone;
  title: string;
  meta: string;
  onDownload?: () => Promise<void>;
  /** Locked cards render as inert placeholders with a reason. */
  locked?: boolean;
  lockReason?: string;
  /** Certificate-style feature card with emerald gradient. */
  highlight?: boolean;
}

export default function DocCard({ icon, tone = 'slate', title, meta, onDownload, locked, lockReason, highlight }: DocCardProps) {
  const [busy, setBusy] = useState(false);

  const handle = async () => {
    if (locked || busy || !onDownload) return;
    setBusy(true);
    try {
      await onDownload();
    } catch {
      // toast already shown by download()
    } finally {
      setBusy(false);
    }
  };

  if (locked) {
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-400">
          <Lock size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-400">{title}</p>
          <p className="truncate text-xs text-slate-400">{lockReason}</p>
        </div>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          <Lock size={10} /> Locked
        </span>
      </div>
    );
  }

  if (highlight) {
    return (
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className="group relative col-span-full flex w-full items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-left text-white shadow-lift transition-all hover:shadow-[0_12px_32px_rgba(5,150,105,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-80 sm:col-span-2"
      >
        <div className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15">{icon}</div>
        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold">{title}</p>
            <span className="rounded-full border border-white/25 bg-white/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">PDF</span>
          </div>
          <p className="mt-0.5 truncate text-xs text-emerald-100">{meta}</p>
        </div>
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/15 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
          {busy ? <InlineSpinner /> : <Download size={16} />}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={busy}
      className="group flex w-full items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-soft transition-all hover:border-slate-300 hover:shadow-lift focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-70"
    >
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">PDF</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-slate-500">{meta}</p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all group-hover:bg-emerald-50 group-hover:text-emerald-600" aria-hidden="true">
        {busy ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" aria-hidden="true" /> : <Download size={16} className="transition-transform group-hover:translate-x-0.5" />}
      </span>
    </button>
  );
}
