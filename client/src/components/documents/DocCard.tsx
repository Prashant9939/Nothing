import { useState, type ReactNode } from 'react';
import { Download, Lock } from 'lucide-react';

interface DocCardProps {
  icon: ReactNode;
  title: string;
  seq?: number;
  /** Short dossier-section label; null hides the label and its separator. */
  categoryLabel?: string | null;
  /** Alternating icon-well treatment: burnt tint on odd, neutral on even. */
  tone?: 'tint' | 'neutral';
  onDownload?: () => Promise<void>;
  /** Streams the PDF into a new tab (blob URL, auth headers). */
  onPreview?: () => Promise<string>;
  /** Locked cards render as inert placeholders with a reason. */
  locked?: boolean;
  lockReason?: string;
}

export default function DocCard({
  icon, title, seq, categoryLabel, tone = 'tint',
  onDownload, onPreview, locked, lockReason,
}: DocCardProps) {
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const handleDownload = async () => {
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

  const handlePreview = async () => {
    if (locked || previewing || !onPreview) return;
    setPreviewing(true);
    // Open the tab synchronously inside the click so the popup blocker still
    // allows it, then fill it once the authenticated fetch resolves.
    const win = window.open('', '_blank');
    try {
      const url = await onPreview();
      if (win) win.location.replace(url);
      else window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      win?.close(); // toast already shown by previewDoc()
    } finally {
      setPreviewing(false);
    }
  };

  if (locked) {
    return (
      <div className="flex items-center gap-4 rounded-[24px] border border-dashed border-sand-dark bg-cream/60 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sand bg-sand/60 text-charcoal">
          <Lock size={18} />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-sm font-medium text-charcoal">{title}</p>
          <p className="truncate text-xs text-charcoal">{lockReason}</p>
        </div>
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border border-sand bg-sand/70 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-charcoal">
          <Lock size={10} /> Locked
        </span>
      </div>
    );
  }

  const well = tone === 'tint'
    ? 'border-burnt/20 bg-burnt-tint text-burnt'
    : 'border-sand bg-cream text-ink';

  return (
    <article className="bento-card group flex flex-col rounded-[24px] border border-sand bg-alabaster p-4 shadow-bento hover:border-sand-dark">
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${well}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate font-display text-lg font-bold text-ink sm:text-xl">{title}</p>
            <button
              type="button"
              onClick={handleDownload}
              disabled={busy || previewing}
              aria-label={`Download ${title}`}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-sand bg-cream px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-burnt hover:bg-burnt hover:text-cream focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40 disabled:opacity-60"
            >
              {busy
                ? <span className="block h-4 w-4 animate-spin rounded-full border-2 border-cream/30 border-t-cream" aria-hidden="true" />
                : <Download size={14} />}
              PDF
            </button>
          </div>
          <span className="mt-1 inline-block rounded-md border border-sand bg-cream px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-charcoal">
            PDF
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-sand pt-2.5">
        <span className="flex min-w-0 items-center gap-2 font-mono text-xs">
          {seq != null && <span className="font-bold text-burnt">#{String(seq).padStart(2, '0')}</span>}
          {categoryLabel && (
            <>
              <span className="text-sand-dark" aria-hidden="true">·</span>
              <span className="truncate text-charcoal">{categoryLabel}</span>
            </>
          )}
        </span>
        <button
          type="button"
          onClick={handlePreview}
          disabled={previewing}
          aria-label={`Preview ${title}`}
          className="shrink-0 text-xs font-semibold text-ink transition-colors hover:text-burnt focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
        >
          {previewing ? 'Opening…' : 'Preview →'}
        </button>
      </div>
    </article>
  );
}
