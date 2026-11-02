import { useEffect, useState } from 'react';

// Rows per page for every paginated account list (Users, Admins, Partners).
export const PAGE_SIZE = 10;

// Debounce server-driven search inputs so we fire one request per pause in
// typing instead of one per keystroke. Resets `value` back to `immediate`
// after the delay; also fires on mount (harmless — value already equals it).
export function useDebouncedValue(immediate: string, delayMs = 300) {
  const [value, setValue] = useState(immediate);
  useEffect(() => {
    const t = setTimeout(() => setValue(immediate), delayMs);
    return () => clearTimeout(t);
  }, [immediate, delayMs]);
  return value;
}

interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  noun: string; // 'students', 'admins', 'partners'
  onPage: (p: number) => void;
}

// Always show first, last and current ±1, with ellipses for the gaps.
function pageButtons(page: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const wanted = [...new Set([1, pages, page - 1, page, page + 1])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const n of wanted) {
    if (n - prev > 1) out.push('…');
    out.push(n);
    prev = n;
  }
  return out;
}

export default function Pagination({ page, pages, total, noun, onPage }: PaginationProps) {
  if (total === 0) return null;
  const from = (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const btn =
    'h-8 px-2.5 text-xs rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-slate-700/20 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-gray-100">
      <span className="text-xs text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}–{to}</span> of{' '}
        <span className="font-medium text-gray-700">{total}</span> {noun}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className={`${btn} border-gray-200 text-gray-600 hover:bg-gray-50`}
        >
          Previous
        </button>
        {pageButtons(page, pages).map((n, i) =>
          n === '…' ? (
            <span key={`gap-${i}`} className="px-1 text-xs text-gray-400">…</span>
          ) : (
            <button
              key={n}
              onClick={() => onPage(n)}
              aria-current={n === page ? 'page' : undefined}
              className={`${btn} ${
                n === page
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {n}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className={`${btn} border-gray-200 text-gray-600 hover:bg-gray-50`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
