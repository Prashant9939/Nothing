import { BookOpen, CheckCircle, Clock, Lock } from 'lucide-react';
import type { LearningModule } from '../../api';

interface ModuleCardProps {
  module: LearningModule;
  isCompleted: boolean;
  isLocked: boolean;
  onClick: () => void;
}

/* Learning module card in the documents-page design language: alabaster
   bento, alternating icon wells (order number / check / lock), display
   title with difficulty chip, hairline footer with #NN · duration and an
   Open/Review action. Locked cards use the dashed inert treatment. */

export default function ModuleCard({ module, isCompleted, isLocked, onClick }: ModuleCardProps) {
  const difficultyChip =
    module.difficulty === 'beginner' ? 'border-burnt/20 bg-burnt-tint text-burnt'
    : module.difficulty === 'intermediate' ? 'border-amber-200 bg-amber-50 text-amber-700'
    : module.difficulty === 'advanced' ? 'border-noir bg-noir text-cream'
    : 'border-sand bg-cream text-charcoal';

  if (isLocked) {
    return (
      <div
        role="button"
        aria-disabled="true"
        className="flex cursor-not-allowed items-center gap-4 rounded-[24px] border border-dashed border-sand-dark bg-cream/60 p-4 opacity-90"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-sand bg-sand/60 text-charcoal">
          <Lock size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="min-w-0 break-words font-display text-base font-bold text-charcoal">{module.title}</p>
            <span className="shrink-0 rounded-full border border-sand bg-cream px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wide text-charcoal">
              Locked
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-charcoal">
            Complete the previous module to unlock
          </p>
        </div>
      </div>
    );
  }

  const well = isCompleted
    ? 'border-burnt/20 bg-burnt-tint text-burnt'
    : module.moduleOrder % 2 === 1
      ? 'border-burnt/20 bg-burnt-tint text-burnt'
      : 'border-sand bg-cream text-ink';

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className="bento-card group cursor-pointer rounded-[24px] border border-sand bg-alabaster p-4 shadow-bento transition-all hover:border-sand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border font-mono text-sm font-bold ${well}`}>
          {isCompleted
            ? <CheckCircle size={20} />
            : <span aria-hidden="true">{String(module.moduleOrder).padStart(2, '0')}</span>}
        </span>
        <div className="min-w-0 flex-1">
          <p className="break-words font-display text-base font-bold text-ink sm:text-lg">{module.title}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${difficultyChip}`}>
              {module.difficulty}
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-charcoal">
              <Clock size={12} aria-hidden="true" />
              {module.durationMinutes} min
            </span>
            {module.contentSections && module.contentSections.length > 0 && (
              <span className="flex items-center gap-1 font-mono text-[11px] text-charcoal">
                <BookOpen size={12} aria-hidden="true" />
                {module.contentSections.length} sections
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-sand pt-2.5">
        <span className="min-w-0 truncate font-mono text-xs text-charcoal">
          #{String(module.moduleOrder).padStart(2, '0')} · {module.durationMinutes} min
        </span>
        {isCompleted
          ? <span className="shrink-0 text-xs font-semibold text-ink transition-colors group-hover:text-burnt">Review →</span>
          : <span className="shrink-0 text-xs font-semibold text-ink transition-colors group-hover:text-burnt">Open →</span>}
      </div>
    </div>
  );
}
