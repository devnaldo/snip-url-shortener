export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

export const inputClassName = (invalid = false): string =>
  cn(
    'block w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition',
    'placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20',
    'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500',
    invalid ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-300',
  );

export const cardClassName = 'rounded-xl border border-slate-200 bg-white shadow-sm';

export const focusRingClassName =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';
export type ButtonSize = 'sm' | 'md';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
  secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  danger: 'bg-rose-600 text-white hover:bg-rose-700',
  dangerGhost: 'border border-rose-200 bg-white text-rose-600 hover:bg-rose-50',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-3.5 py-2 text-sm',
};

export function buttonClassName(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return cn(
    'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition',
    'disabled:cursor-not-allowed disabled:opacity-50',
    focusRingClassName,
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    extra,
  );
}
