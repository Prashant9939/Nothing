import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: 'neutral' | 'error';
  className?: string;
}

export default function EmptyState({ icon, title, description, action, tone = 'neutral', className = '' }: EmptyStateProps) {
  const isError = tone === 'error';
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed ${isError ? 'border-red-200 bg-red-50/40' : 'border-slate-200 bg-white'} px-6 py-12 text-center ${className}`}>
      <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-full ${isError ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-500'}`}>
        {icon}
      </div>
      <h3 className={`text-base font-semibold ${isError ? 'text-red-700' : 'text-slate-900'}`}>{title}</h3>
      {description && <p className={`mt-1 max-w-sm text-sm ${isError ? 'text-red-600/80' : 'text-slate-500'}`}>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
