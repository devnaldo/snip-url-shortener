import { cn } from '../lib/styles';

interface SpinnerProps {
  className?: string;
}

export function Spinner({ className }: SpinnerProps) {
  return (
    <svg
      className={cn('h-5 w-5 animate-spin', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
    </svg>
  );
}

export function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 px-4">
      <Spinner className="h-7 w-7 text-indigo-600" />
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}
