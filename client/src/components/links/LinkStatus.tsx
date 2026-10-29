import type { LinkDto } from '../../api/types';
import { linkState } from '../../lib/link-state';
import type { LinkState } from '../../lib/link-state';

const STATE_STYLES: Record<LinkState, { badge: string; dot: string }> = {
  active: {
    badge: 'border-success/35 bg-success-soft text-success',
    dot: 'bg-success',
  },
  disabled: {
    badge: 'border-line bg-surface-2 text-muted',
    dot: 'bg-subtle',
  },
  expired: {
    badge: 'border-warn/35 bg-warn-soft text-warn',
    dot: 'bg-warn',
  },
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
      className={`inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 font-mono text-[0.625rem] font-medium uppercase leading-none tracking-[0.1em] ${STATE_STYLES[state].badge}`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 ${STATE_STYLES[state].dot}`} />
      {STATE_LABELS[state]}
    </span>
  );
}
