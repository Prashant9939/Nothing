import type { KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, CalendarDays, Check, Clock } from 'lucide-react';
import type { Internship } from '../api';
import { categoryIcons, categoryImage, categoryLabels, titleCase } from '../categories';

const formatMoney = (value: number) => `?${Number(value).toLocaleString('en-IN')}`;

const formatDate = (value: string) => {
  const d = /^\d{4}-\d{2}-\d{2}/.test(value) ? new Date(value.slice(0, 10)) : new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

interface InternshipCardProps {
  internship: Internship;
  /** `public` renders an Enroll CTA (marketing pages); `select` renders a clickable selection card (student area). */
  variant?: 'public' | 'select';
  selected?: boolean;
  enrolled?: boolean;
  onSelect?: () => void;
  className?: string;
}

export default function InternshipCard({
  internship,
  variant = 'public',
  selected = false,
  enrolled = internship.isEnrolled ?? false,
  onSelect,
  className = '',
}: InternshipCardProps) {
  const discount = internship.originalPrice && internship.originalPrice > internship.price
    ? Math.round((1 - internship.price / internship.originalPrice) * 100)
    : 0;
  const topics = (internship.topics || '').split(',').map((t) => t.trim()).filter(Boolean);
  const categoryLabel = categoryLabels[internship.category] || titleCase(internship.category);
  const CategoryIcon = categoryIcons[internship.category] || BookOpen;

  const interactive = variant === 'select' && !enrolled;

  const shell = variant === 'public'
    ? 'group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-orange-200/80 hover:shadow-lift'
    : `group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-soft transition-all duration-300 focus:outline-none ${
        !interactive
          ? 'cursor-default border-slate-200/70'
          : `cursor-pointer focus-visible:ring-2 focus-visible:ring-orange-500/40 ${
              selected
                ? 'border-orange-500 shadow-lift ring-2 ring-orange-500/15'
                : 'border-slate-200/70 hover:-translate-y-1 hover:border-orange-200/80 hover:shadow-lift'
            }`
      }`;

  const interactiveProps = interactive
    ? {
        role: 'button' as const,
        tabIndex: 0,
        'aria-pressed': selected || undefined,
        onClick: () => onSelect?.(),
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect?.();
          }
        },
      }
    : {};

  return (
    <div className={`${shell} ${className}`} {...interactiveProps}>
      {/* Image header with blur */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 px-6 pt-6 pb-5 text-white">
        <img
          src={categoryImage(internship.category)}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-[1px]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/55 to-slate-900/15" />
        <div className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-500/20 blur-3xl transition-all duration-500 group-hover:bg-orange-500/35" />

        <div className="relative flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur-sm">
              <CategoryIcon size={20} className="text-white/90" />
            </span>
            <span className="truncate pt-1 text-[11px] font-semibold uppercase tracking-widest text-white/60">
              {categoryLabel}
            </span>
          </div>

          {variant === 'public' && discount > 0 && (
            <span className="shrink-0 rounded-full bg-orange-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-lg shadow-orange-500/30">
              {discount}% OFF
            </span>
          )}
          {variant === 'select' && enrolled && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
              <Check size={11} /> Enrolled
            </span>
          )}
        </div>

        <h3 className="relative mt-4 line-clamp-2 text-lg font-bold leading-snug [text-shadow:0_1px_4px_rgba(2,6,23,0.6)]">{internship.title}</h3>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-6">
        <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-slate-500">{internship.description}</p>

        <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <Clock size={13} className="text-slate-500" /> {internship.duration} Days
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BookOpen size={13} className="text-slate-500" /> {internship.modules} Modules
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Award size={13} className="text-slate-500" /> Certificate
          </span>
        </div>

        {variant === 'public' && internship.examDate && (
          <div className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700">
            <CalendarDays size={13} /> Final exam: {formatDate(internship.examDate)}
          </div>
        )}

        {topics.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {topics.slice(0, 4).map((t, i) => (
              <span
                key={`${t}-${i}`}
                className="rounded-full border border-slate-100 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600"
              >
                {t}
              </span>
            ))}
            {topics.length > 4 && (
              <span className="rounded-full border border-slate-100 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500">
                +{topics.length - 4}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-xl font-bold text-slate-900">{formatMoney(internship.price)}</span>
            {discount > 0 && (
              <span className="text-sm text-slate-500 line-through">{formatMoney(internship.originalPrice)}</span>
            )}
            {variant === 'select' && discount > 0 && (
              <span className="text-xs font-bold text-orange-600">{discount}% OFF</span>
            )}
          </div>

          {variant === 'public' && (
            <Link
              to="/register"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/25 transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-lg hover:shadow-orange-500/30"
            >
              Enroll Now <ArrowRight size={14} />
            </Link>
          )}

          {variant === 'select' && !enrolled && (
            selected ? (
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-500">
                <Check size={15} /> Selected
              </span>
            ) : (
              <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-500 transition-colors group-hover:text-orange-500">
                Select <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            )
          )}
        </div>
      </div>
    </div>
  );
}
