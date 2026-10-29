import type { AnalyticsRange } from '../../api/types';
import { cn, focusRingClassName } from '../../lib/styles';

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
      className="inline-flex w-full rounded-lg border border-slate-200 bg-white p-1 shadow-sm sm:w-auto"
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
              'flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition sm:flex-none',
              focusRingClassName,
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
            )}
          >
            {range.label}
          </button>
        );
      })}
    </div>
  );
}
