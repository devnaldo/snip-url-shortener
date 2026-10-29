import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../lib/styles';
import { ToastContext } from './toast-context';
import type { ShowToast, ToastItem, ToastVariant } from './toast-context';
import { AlertIcon, CheckIcon, CloseIcon, LinkIcon } from '../components/Icons';

const TOAST_DURATION_MS = 4_500;

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: 'border-l-success',
  error: 'border-l-danger',
  info: 'border-l-accent',
};

const VARIANT_ICON_STYLES: Record<ToastVariant, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
};

const VARIANT_ICONS: Record<ToastVariant, ReactNode> = {
  success: <CheckIcon className="h-3.5 w-3.5" />,
  error: <AlertIcon className="h-3.5 w-3.5" />,
  info: <LinkIcon className="h-3.5 w-3.5" />,
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
        className="pointer-events-none fixed inset-x-3 bottom-3 z-40 flex flex-col gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-[21rem]"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.variant === 'error' ? 'alert' : 'status'}
            className={cn(
              'pointer-events-auto flex animate-toast-in items-start gap-3 rounded-md border border-l-2 border-line bg-surface px-3.5 py-3 text-xs text-ink shadow-overlay',
              VARIANT_STYLES[toast.variant],
            )}
          >
            <span className={cn('mt-px shrink-0', VARIANT_ICON_STYLES[toast.variant])}>
              {VARIANT_ICONS[toast.variant]}
            </span>
            <p className="min-w-0 flex-1 break-words leading-relaxed">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="-mr-1 -mt-1 shrink-0 rounded-sm p-1 text-subtle transition-colors duration-150 hover:bg-surface-2 hover:text-ink"
              aria-label="Dismiss notification"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
