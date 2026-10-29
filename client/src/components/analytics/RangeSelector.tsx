import type { AnalyticsRange } from '../../api/types';
import { cn } from '../../lib/styles';

const RANGES: Array<{ value: AnalyticsRange; label: string }> = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
];

interface RangeSelectorProps {
  value: AnalyticsRange;
  onChange: (range: AnalyticsRange) => void;
}

export function RangeSelector({ value, onChange }: RangeSelectorProps) {
  return (
    <div
      className="inline-flex w-full rounded-md border border-line bg-surface p-0.5 sm:w-auto"
      role="group"
      aria-label="Analytics range"
    >
      {RANGES.map((range) => {
        const isActive = range.value === value;

        return (
          <button
            key={range.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(range.value)}
            className={cn(
              'flex-1 rounded-sm px-3 py-1.5 font-mono text-[0.6875rem] font-medium uppercase tracking-[0.1em] transition-colors duration-150 sm:flex-none',
              isActive
                ? 'bg-accent text-accent-ink'
                : 'text-muted hover:bg-surface-2 hover:text-ink',
            )}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
