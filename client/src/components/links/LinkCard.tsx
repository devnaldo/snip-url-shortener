import type { LinkListItem } from '../../api/types';
import { formatDate, formatDateTime } from '../../lib/format';
import { LinkActions } from './LinkActions';
import { LinkStatusBadge } from './LinkStatus';
import { StatusToggle } from './StatusToggle';

interface LinkCardProps {
  link: LinkListItem;
  isToggling: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShowQr: () => void;
}

export function LinkCard({
  link,
  isToggling,
  onToggle,
  onEdit,
  onDelete,
  onShowQr,
}: LinkCardProps) {
  return (
    <article className="rounded-lg border border-line bg-surface">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="min-w-0 truncate font-mono text-[0.8125rem] font-semibold text-ink"
              title={link.alias}
            >
              {link.alias}
            </h3>
            <LinkStatusBadge link={link} />
          </div>
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 block truncate font-mono text-[0.6875rem] text-accent hover:underline"
          >
            {link.shortUrl}
          </a>
        </div>
        <StatusToggle
          checked={link.isActive}
          disabled={isToggling}
          label={`${link.isActive ? 'Disable' : 'Enable'} ${link.alias}`}
          onChange={onToggle}
        />
      </div>

      <dl className="mt-3 space-y-3 border-t border-line px-4 py-3">
        <div>
          <dt className="eyebrow">Destination</dt>
          <dd className="mt-1 break-all text-[0.75rem] leading-relaxed text-muted">
            {link.destinationUrl}
          </dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="eyebrow">Clicks</dt>
            <dd className="mt-1 font-terminal text-xl leading-none text-ink">{link.clickCount}</dd>
          </div>
          <div>
            <dt className="eyebrow">Created</dt>
            <dd className="mt-1 text-[0.75rem] text-muted">{formatDate(link.createdAt)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="eyebrow">Expires</dt>
            <dd className="mt-1 text-[0.75rem] text-muted">
              {link.expiresAt ? formatDateTime(link.expiresAt) : 'Never'}
            </dd>
          </div>
        </div>
      </dl>

      <div className="border-t border-line px-2 py-1.5">
        <LinkActions
          compact
          spread
          link={link}
          onEdit={onEdit}
          onDelete={onDelete}
          onShowQr={onShowQr}
        />
      </div>
    </article>
  );
}
