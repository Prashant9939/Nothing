import { CheckCircle2 } from 'lucide-react';
import type { Enrollment } from '../../api';

export type TrackStatusTone = 'default' | 'burnt' | 'red' | 'amber';

export interface TrackStatus {
  text: string;
  tone: TrackStatusTone;
}

interface TrackAsideProps {
  enrollments: Enrollment[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  statusFor: (enrollment: Enrollment) => TrackStatus;
}

const toneCls: Record<TrackStatusTone, string> = {
  default: 'text-noir/40',
  burnt: 'text-burnt',
  red: 'text-red-500/80',
  amber: 'text-amber-600',
};

/**
 * Vertical "Your Tracks" selector from the mockup: the active track is a
 * noir card with a burnt progress bar; inactive tracks are outlined cards
 * carrying a real status label. Shared by Learning and Exam so both pages
 * speak the same navigation language.
 */
export default function TrackAside({ enrollments, selectedId, onSelect, statusFor }: TrackAsideProps) {
  return (
    <aside className="flex flex-col gap-4 lg:col-span-4">
      <div className="mb-2 flex items-end justify-between gap-3">
        <h2 className="font-display text-lg font-bold text-noir">Your Tracks</h2>
        <span className="text-xs font-bold uppercase tracking-wider text-noir/50">
          {enrollments.length} Enrolled
        </span>
      </div>

      {enrollments.map((enrollment) => {
        const isSelected = enrollment.id === selectedId;
        const isComplete = enrollment.progress >= 100;
        const status = statusFor(enrollment);

        if (isSelected) {
          return (
            <div
              key={enrollment.id}
              aria-current="true"
              className="relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-noir p-5 text-cream shadow-xl transition-transform hover:scale-[1.01]"
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-burnt opacity-20 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative z-10 flex items-start justify-between gap-3">
                <h3 className="pr-1 text-lg font-bold leading-tight">{enrollment.internshipTitle}</h3>
                {isComplete && <CheckCircle2 size={24} className="mt-0.5 shrink-0 text-burnt" aria-hidden="true" />}
              </div>
              <div className="relative z-10">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold">
                  <span className="uppercase tracking-wider text-cream/70">Progress</span>
                  <span className="text-burnt">{enrollment.progress}% Complete</span>
                </div>
                <div
                  className="h-1.5 w-full overflow-hidden rounded-full bg-cream/20"
                  role="progressbar"
                  aria-valuenow={enrollment.progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${enrollment.internshipTitle} progress`}
                >
                  <div
                    className="h-full rounded-full bg-burnt transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, enrollment.progress))}%` }}
                  />
                </div>
              </div>
            </div>
          );
        }

        return (
          <button
            key={enrollment.id}
            type="button"
            onClick={() => onSelect(enrollment.id)}
            className="group flex flex-col gap-3 rounded-2xl border border-noir/15 p-5 text-left transition-all hover:border-noir/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-burnt/40"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-lg font-bold text-noir/80 transition-colors group-hover:text-noir">
                {enrollment.internshipTitle}
              </h3>
              {isComplete && <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-burnt/50" aria-hidden="true" />}
            </div>
            <div className={`text-xs font-bold uppercase tracking-wider ${toneCls[status.tone]}`}>
              {status.text}
            </div>
          </button>
        );
      })}
    </aside>
  );
}
