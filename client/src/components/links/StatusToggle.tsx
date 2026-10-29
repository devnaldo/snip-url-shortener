import { cn } from '../../lib/styles';

interface StatusToggleProps {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: () => void;
}

export function StatusToggle({ checked, label, disabled = false, onChange }: StatusToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-sm border transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-accent bg-accent' : 'border-line-strong bg-surface-3',
      )}
    >
      <span
        className={cn(
          'absolute left-0.5 h-3.5 w-3.5 rounded-[1px] transition-transform duration-150',
          checked ? 'translate-x-[1.125rem] bg-accent-ink' : 'translate-x-0 bg-subtle',
        )}
      />
    </button>
  );
}
