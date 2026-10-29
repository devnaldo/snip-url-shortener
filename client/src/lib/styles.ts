export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/** Shared text input treatment: consistent height, border, and hover/focus states. */
export const inputClassName = (invalid = false): string =>
  cn(
    'block h-9 w-full rounded-md border bg-surface px-3 text-[0.8125rem] text-ink',
    'transition-colors duration-150 placeholder:text-subtle',
    'hover:border-line-strong',
    'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-2 disabled:text-subtle',
    invalid ? 'border-danger' : 'border-line',
  );

export const cardClassName = 'rounded-lg border border-line bg-surface';

/** Small uppercase technical label, mirrored by the `.eyebrow` CSS class. */
export const eyebrowClassName =
  'font-mono text-[0.6875rem] font-medium uppercase leading-none tracking-[0.12em] text-subtle';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerGhost';
export type ButtonSize = 'sm' | 'md' | 'icon' | 'iconSm';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
  secondary: 'border border-line bg-surface text-ink hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger text-danger-ink hover:bg-danger-hover',
  dangerGhost:
    'border border-line bg-surface text-danger hover:border-danger/50 hover:bg-danger-soft',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-2.5 text-[0.75rem]',
  md: 'h-9 px-3.5 text-[0.8125rem]',
  icon: 'h-8 w-8 p-0',
  iconSm: 'h-7 w-7 p-0',
};

export function buttonClassName(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return cn(
    'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium',
    'transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-out',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-50',
    BUTTON_VARIANTS[variant],
    BUTTON_SIZES[size],
    extra,
  );
}
