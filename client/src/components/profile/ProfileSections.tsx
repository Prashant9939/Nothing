import type { ReactNode } from 'react';
import { XCircle } from 'lucide-react';
import { Card } from '../ui';

/* Shared building blocks for every profile screen (student, admin, partner):
   a titled section card with an optional Edit/Cancel action, and the read-only
   label/value grid shown when the section is not being edited. */

export function SectionCard({ id, icon, title, subtitle, action, error, children }: {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  action?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <Card id={id} className="overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{icon}</div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {error && (
        <div className="mx-6 mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-red-100"><XCircle size={15} /></span>
          {error}
        </div>
      )}
      <div className="p-6">{children}</div>
    </Card>
  );
}

export function ViewRows({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
      {rows.map((r) => (
        <div key={r.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{r.label}</dt>
          <dd className="mt-1 text-sm font-medium text-slate-900">
            {r.value || <span className="font-normal text-slate-500">Not provided</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* The five details the app already collects at registration but never used to
   show: gender/DOB are stored as the raw values the signup form writes
   ('male'/'female'/'other' and ISO 'YYYY-MM-DD'). */

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const formatGender = (v: string) =>
  GENDER_OPTIONS.find((o) => o.value === v)?.label || '';

export const formatDob = (v: string) => {
  if (!v) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return v; // unknown legacy shape: show as stored
  const d = new Date(`${v}T00:00:00`);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};
