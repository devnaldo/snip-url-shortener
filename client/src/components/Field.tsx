import type { ReactNode } from 'react';
import { AlertIcon } from './Icons';

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}

export function Field({ id, label, error, hint, optional = false, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-baseline gap-2 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] text-muted"
      >
        <span>{label}</span>
        {optional ? (
          <span className="text-[0.625rem] font-normal normal-case tracking-normal text-subtle">
            optional
          </span>
        ) : null}
      </label>

      {children}

      {hint && !error ? (
        <p id={`${id}-hint`} className="text-[0.6875rem] leading-relaxed text-subtle">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="flex items-start gap-1.5 text-[0.6875rem] leading-relaxed text-danger"
        >
          <AlertIcon className="mt-[2px] h-3 w-3 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}
