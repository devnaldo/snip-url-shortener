import type { ReferrerClicks } from '../../api/types';
import { formatNumber } from '../../lib/format';

interface ReferrerListProps {
  data: ReferrerClicks[];
}

export function ReferrerList({ data }: ReferrerListProps) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-subtle">
        No referrer data yet
      </p>
    );
  }

  const maxClicks = Math.max(...data.map((row) => row.clicks), 1);

  return (
    <ul className="divide-y divide-line">
      {data.map((row) => (
        <li key={row.referrer} className="py-2.5 first:pt-0 last:pb-0">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-xs text-muted" title={row.referrer}>
              {row.referrer}
            </span>
            <span className="shrink-0 font-terminal text-base leading-none text-ink">
              {formatNumber(row.clicks)}
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden bg-surface-2">
            <div
              className="h-full bg-accent"
              style={{ width: `${Math.max((row.clicks / maxClicks) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
