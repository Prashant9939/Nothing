import { PASSWORD_CHECKS, passwordChecks } from '../../passwordPolicy';

export default function PasswordHints({ value, className = '' }: { value: string; className?: string }) {
  if (!value) return null;
  const checks = passwordChecks(value);
  return (
    <ul className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2 ${className}`}>
      {PASSWORD_CHECKS.map((req) => {
        const ok = checks[req.key];
        return (
          <li key={req.key} className={`flex items-center gap-1.5 ${ok ? 'text-emerald-600' : 'text-gray-400'}`}>
            <span className={`inline-flex w-3.5 h-3.5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold leading-none ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
              {ok ? '✓' : ''}
            </span>
            {req.label}
          </li>
        );
      })}
    </ul>
  );
}
