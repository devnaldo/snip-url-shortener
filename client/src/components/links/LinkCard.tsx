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
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-slate-900">{link.alias}</h3>
            <LinkStatusBadge link={link} />
          </div>
          <a
            href={link.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 block truncate text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
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

      <dl className="mt-4 space-y-3 border-t border-slate-100 pt-3 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Destination
          </dt>
          <dd className="mt-0.5 break-all text-slate-700">{link.destinationUrl}</dd>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Clicks</dt>
            <dd className="mt-0.5 font-medium text-slate-900">{link.clickCount}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Created</dt>
            <dd className="mt-0.5 text-slate-700">{formatDate(link.createdAt)}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Expires</dt>
            <dd className="mt-0.5 text-slate-700">
              {link.expiresAt ? formatDateTime(link.expiresAt) : 'Never'}
            </dd>
          </div>
        </div>
      </dl>

      <div className="mt-4 border-t border-slate-100 pt-3">
        <LinkActions link={link} onEdit={onEdit} onDelete={onDelete} onShowQr={onShowQr} />
      </div>
    </article>
  );
}
