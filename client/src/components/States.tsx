import type { ReactNode } from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M12.586 4.586a2 2 0 1 1 2.828 2.828l-3 3a2 2 0 0 1-2.828 0 1 1 0 0 0-1.414 1.414 4 4 0 0 0 5.656 0l3-3a4 4 0 0 0-5.656-5.656l-1.5 1.5a1 1 0 1 0 1.414 1.414l1.5-1.5Zm-5.172 4.828a2 2 0 0 0-2.828 2.828l3 3a2 2 0 0 0 2.828 0 1 1 0 0 1 1.414 1.414 4 4 0 0 1-5.656 0l-3-3a4 4 0 0 1 5.656-5.656l1.5 1.5a1 1 0 1 1-1.414 1.414l-1.5-1.5Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-600">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-6 text-center"
    >
      <h3 className="text-sm font-semibold text-rose-900">{title}</h3>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
