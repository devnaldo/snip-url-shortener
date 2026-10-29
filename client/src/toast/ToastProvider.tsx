import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../lib/styles';
import { ToastContext } from './toast-context';
import type { ShowToast, ToastItem, ToastVariant } from './toast-context';

const TOAST_DURATION_MS = 4_500;

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-rose-200 bg-rose-50 text-rose-900',
  info: 'border-slate-200 bg-white text-slate-900',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);

    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback<ShowToast>((message, variant = 'info') => {
    const id = nextId.current;
    nextId.current += 1;
    setToasts((current) => [...current, { id, message, variant }]);

    const timer = window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
      timers.current.delete(id);
    }, TOAST_DURATION_MS);

    timers.current.set(id, timer);
  }, []);

  useEffect(() => {
    const activeTimers = timers.current;

    return () => {
      activeTimers.forEach((timer) => window.clearTimeout(timer));
      activeTimers.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg',
              VARIANT_STYLES[toast.variant],
            )}
          >
            <p className="min-w-0 flex-1 break-words">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="shrink-0 rounded p-0.5 opacity-60 transition hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              aria-label="Dismiss notification"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
