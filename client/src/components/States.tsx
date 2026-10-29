import type { ReactNode } from 'react';
import { AlertIcon, InboxIcon } from './Icons';
import { Button } from './Button';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-sm border border-line bg-surface-2 text-subtle">
        <InboxIcon className="h-5 w-5" />
      </span>
      <h3 className="font-display text-[0.8125rem] uppercase tracking-[0.06em] text-ink">
        {title}
      </h3>
      <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
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
      className="rounded-lg border border-danger/40 bg-danger-soft px-5 py-6 text-center"
    >
      <span className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-sm border border-danger/30 text-danger">
        <AlertIcon className="h-4 w-4" />
      </span>
      <h3 className="font-display text-[0.75rem] uppercase tracking-[0.06em] text-ink">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-muted">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
