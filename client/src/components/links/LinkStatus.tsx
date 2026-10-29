import type { LinkDto } from '../../api/types';
import { linkState } from '../../lib/link-state';
import type { LinkState } from '../../lib/link-state';

const STATE_STYLES: Record<LinkState, string> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  disabled: 'bg-slate-100 text-slate-600 ring-slate-200',
  expired: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const STATE_LABELS: Record<LinkState, string> = {
  active: 'Active',
  disabled: 'Disabled',
  expired: 'Expired',
};

export function LinkStatusBadge({ link }: { link: Pick<LinkDto, 'isActive' | 'expiresAt'> }) {
  const state = linkState(link);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATE_STYLES[state]}`}
    >
      {STATE_LABELS[state]}
    </span>
  );
}
