import type { ReferrerClicks } from '../../api/types';
import { formatNumber } from '../../lib/format';

interface ReferrerListProps {
  data: ReferrerClicks[];
}

export function ReferrerList({ data }: ReferrerListProps) {
  if (data.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-500">No referrer data yet.</p>;
  }

  const maxClicks = Math.max(...data.map((row) => row.clicks), 1);

  return (
    <ul className="divide-y divide-slate-100">
      {data.map((row) => (
        <li key={row.referrer} className="py-2.5 first:pt-0 last:pb-0">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm text-slate-700" title={row.referrer}>
              {row.referrer}
            </span>
            <span className="shrink-0 text-sm font-medium text-slate-900">
              {formatNumber(row.clicks)}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${Math.max((row.clicks / maxClicks) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
