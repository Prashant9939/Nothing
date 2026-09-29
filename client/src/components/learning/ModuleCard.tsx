import { BookOpen, CheckCircle, Clock, Lock, Play } from 'lucide-react';
import type { LearningModule } from '../../api';

interface ModuleCardProps {
  module: LearningModule;
  isCompleted: boolean;
  isLocked: boolean;
  onClick: () => void;
}

export default function ModuleCard({ module, isCompleted, isLocked, onClick }: ModuleCardProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'intermediate': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'advanced': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div
      onClick={!isLocked ? onClick : undefined}
      role={!isLocked ? 'button' : undefined}
      tabIndex={!isLocked ? 0 : undefined}
      aria-disabled={isLocked || undefined}
      onKeyDown={(e) => {
        if (isLocked) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
      }}
      className={`group rounded-2xl border bg-white p-5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
        isLocked
          ? 'cursor-not-allowed border-slate-200 opacity-60'
          : isCompleted
            ? 'border-emerald-200 bg-emerald-50/30 hover:border-emerald-300'
            : 'cursor-pointer border-slate-200 shadow-soft hover:border-slate-300 hover:shadow-lift'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold ${
            isCompleted
              ? 'border border-emerald-200 bg-emerald-100 text-emerald-700'
              : isLocked
                ? 'border border-slate-200 bg-slate-100 text-slate-400'
                : 'border border-slate-200 bg-slate-100 text-slate-700'
          }`}>
            {isCompleted ? <CheckCircle className="h-6 w-6" /> : isLocked ? <Lock className="h-5 w-5" /> : module.moduleOrder}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h4 className={`min-w-0 break-words text-sm font-semibold ${isCompleted ? 'text-emerald-800' : 'text-slate-900'}`}>
                {module.title}
              </h4>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  <CheckCircle className="h-3 w-3" />
                  Completed
                </span>
              )}
              {!isCompleted && !isLocked && (
                <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Pending
                </span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{module.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className={`rounded border px-2 py-0.5 text-[10px] font-medium ${getDifficultyColor(module.difficulty)}`}>
                {module.difficulty}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-slate-400">
                <Clock className="h-3 w-3" />
                {module.durationMinutes} min
              </span>
              {module.contentSections && module.contentSections.length > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-slate-400">
                  <BookOpen className="h-3 w-3" />
                  {module.contentSections.length} reading sections
                </span>
              )}
            </div>
          </div>
        </div>
        {!isLocked && !isCompleted && (
          <span aria-hidden="true" className="shrink-0 self-start rounded-lg bg-slate-100 p-2 text-slate-600 transition-colors group-hover:bg-slate-200">
            <Play className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  );
}
