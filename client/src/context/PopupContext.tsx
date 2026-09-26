import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';

type PopupKind = 'success' | 'error' | 'info' | 'warning';

interface MessagePopup {
  kind: PopupKind;
  title: string;
  message: string;
}

interface ConfirmPopup {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
}

interface NotifyOptions {
  kind?: PopupKind;
  title?: string;
}

interface ConfirmOptions {
  title?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface PopupContextType {
  notify: (message: string, options?: NotifyOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

const KIND_STYLE: Record<PopupKind, { header: string; title: string; body: string; icon: ReactNode; button: string }> = {
  success: { header: 'bg-emerald-50 border-emerald-200', title: 'text-emerald-900', body: 'text-emerald-800 bg-emerald-50 border-emerald-200', icon: <CheckCircle2 size={22} className="text-emerald-600" />, button: 'bg-emerald-600 hover:bg-emerald-700' },
  error: { header: 'bg-red-50 border-red-200', title: 'text-red-900', body: 'text-red-800 bg-red-50 border-red-200', icon: <XCircle size={22} className="text-red-500" />, button: 'bg-slate-800 hover:bg-slate-900' },
  info: { header: 'bg-sky-50 border-sky-200', title: 'text-sky-900', body: 'text-sky-800 bg-sky-50 border-sky-200', icon: <Info size={22} className="text-sky-600" />, button: 'bg-slate-800 hover:bg-slate-900' },
  warning: { header: 'bg-amber-50 border-amber-200', title: 'text-amber-900', body: 'text-amber-800 bg-amber-50 border-amber-200', icon: <AlertTriangle size={22} className="text-amber-500" />, button: 'bg-slate-800 hover:bg-slate-900' },
};

const DEFAULT_TITLE: Record<PopupKind, string> = {
  success: 'Success',
  error: 'Something Went Wrong',
  info: 'Notice',
  warning: 'Warning',
};

export function PopupProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<MessagePopup | null>(null);
  const [confirmPopup, setConfirmPopup] = useState<ConfirmPopup | null>(null);
  const confirmResolver = useRef<((value: boolean) => void) | null>(null);

  const notify = useCallback((text: string, options: NotifyOptions = {}) => {
    const kind = options.kind || 'info';
    setMessage({ kind, title: options.title || DEFAULT_TITLE[kind], message: text });
  }, []);

  const success = useCallback((text: string, title?: string) => notify(text, { kind: 'success', title }), [notify]);
  const error = useCallback((text: string, title?: string) => notify(text, { kind: 'error', title }), [notify]);

  const settleConfirm = useCallback((value: boolean) => {
    confirmResolver.current?.(value);
    confirmResolver.current = null;
    setConfirmPopup(null);
  }, []);

  const confirm = useCallback((text: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      confirmResolver.current?.(false);
      confirmResolver.current = resolve;
      setConfirmPopup({
        title: options.title || 'Please Confirm',
        message: text,
        confirmLabel: options.confirmLabel || 'Yes, Continue',
        cancelLabel: options.cancelLabel || 'Cancel',
      });
    });
  }, []);

  useEffect(() => {
    if (!message && !confirmPopup) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (message) setMessage(null);
      else if (confirmPopup) settleConfirm(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [message, confirmPopup, settleConfirm]);

  const renderCard = (kind: PopupKind, title: string, text: string, body: ReactNode, footer: ReactNode) => {
    const style = KIND_STYLE[kind];
    return (
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden text-left">
        <div className={`${style.header} border-b px-6 py-4 flex items-center gap-3`}>
          <span className="shrink-0">{style.icon}</span>
          <h3 className={`text-base font-bold ${style.title}`}>{title}</h3>
        </div>
        <div className="p-6">
          <div className={`${style.body} border rounded-xl p-4 text-sm`}>{text}</div>
          {body}
        </div>
        <div className="flex gap-3 px-6 pb-6">{footer}</div>
      </div>
    );
  };

  const contextValue = useMemo(
    () => ({ notify, success, error, confirm }),
    [notify, success, error, confirm]
  );

  return (
    <PopupContext.Provider value={contextValue}>
      {children}

      {message && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={() => setMessage(null)}>
          <div onClick={(e) => e.stopPropagation()}>
            {renderCard(
              message.kind,
              message.title,
              message.message,
              null,
              <button
                onClick={() => setMessage(null)}
                className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors ${KIND_STYLE[message.kind].button}`}
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}

      {confirmPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="w-full max-w-md">
            {renderCard(
              'warning',
              confirmPopup.title,
              confirmPopup.message,
              null,
              <>
                <button
                  onClick={() => settleConfirm(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  {confirmPopup.cancelLabel}
                </button>
                <button
                  onClick={() => settleConfirm(true)}
                  className="flex-1 py-2.5 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-900 shadow-sm transition-colors"
                >
                  {confirmPopup.confirmLabel}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </PopupContext.Provider>
  );
}

export function usePopup() {
  const context = useContext(PopupContext);
  if (context === undefined) {
    throw new Error('usePopup must be used within a PopupProvider');
  }
  return context;
}
