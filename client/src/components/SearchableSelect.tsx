import { useState, useRef, useEffect } from 'react';

interface Option {
  label: string;
  value: string;
  sub?: string;
}

interface SearchableSelectProps {
  id?: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export default function SearchableSelect({ id, options, value, onChange, placeholder = 'Select...', disabled = false, required = false }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find(o => o.value === value);

  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(query.toLowerCase()) ||
    (o.sub && o.sub.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
    }
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button type="button" id={id} disabled={disabled} onClick={() => !disabled && setOpen(!open)}
        className={`w-full px-3.5 py-2.5 bg-white/60 border border-gray-200/60 rounded-xl text-left text-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 disabled:opacity-50 disabled:cursor-not-allowed ${open ? 'ring-2 ring-orange-500/20 border-orange-400' : ''} ${!selected ? 'text-gray-400' : 'text-gray-900'}`}>
        <span className="flex items-center justify-between">
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <svg className={`w-4 h-4 text-gray-400 shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-gray-200 rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-2 border-b border-gray-100">
            <input ref={inputRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500/30" />
          </div>
          <div className="max-h-56 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No results found</div>
            ) : (
              filtered.map((opt) => (
                <button key={opt.value} type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); setQuery(''); }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 transition-colors flex items-center justify-between ${opt.value === value ? 'bg-orange-50 text-orange-600 font-medium' : 'text-gray-700'}`}>
                  <span className="truncate">{opt.label}</span>
                  {opt.sub && <span className="text-xs text-gray-400 ml-2 shrink-0">{opt.sub}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {required && !value && <input type="text" required className="absolute opacity-0 pointer-events-none" tabIndex={-1} />}
    </div>
  );
}
