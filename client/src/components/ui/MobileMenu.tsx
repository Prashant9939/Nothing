import { useEffect, type ReactNode } from 'react';

interface HamburgerButtonProps {
  open: boolean;
  onClick: () => void;
  className?: string;
}

export function HamburgerButton({ open, onClick, className = '' }: HamburgerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? 'Close menu' : 'Open menu'}
      className={`relative flex h-11 w-11 cursor-pointer flex-col items-center justify-center border-none bg-transparent p-0 ${className}`}
    >
      <span className={`block h-[2px] w-[18px] bg-[#1C1B1F] transition-all duration-300 ${open ? 'translate-y-[8px] rotate-45' : ''}`} />
      <span className={`mt-[6px] block h-[2px] w-[18px] bg-[#1C1B1F] transition-all duration-300 ${open ? 'opacity-0' : ''}`} />
      <span className={`mt-[6px] block h-[2px] w-[18px] bg-[#1C1B1F] transition-all duration-300 ${open ? '-translate-y-[8px] -rotate-45' : ''}`} />
    </button>
  );
}

interface MobileMenuSheetProps {
  open: boolean;
  onClose: () => void;
  /** Height of the visible header row that sits above the sheet (h-16 topbars / nav rows). */
  headerOffset?: string;
  children: ReactNode;
}

export function MobileMenuSheet({ open, onClose, headerOffset = 'h-16', children }: MobileMenuSheetProps) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const mq = window.matchMedia('(min-width: 1024px)');
    const onMq = () => {
      if (mq.matches) onClose();
    };
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation menu"
      className="animate-fade-in fixed inset-0 z-20 flex flex-col bg-white lg:hidden"
    >
      <div aria-hidden className={`shrink-0 ${headerOffset}`} />
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-10 sm:px-6">
        {children}
      </div>
    </div>
  );
}
