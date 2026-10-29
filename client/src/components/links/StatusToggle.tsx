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
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-emerald-500' : 'bg-slate-300',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white shadow transition',
          checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5',
        )}
      />
    </button>
  );
}
