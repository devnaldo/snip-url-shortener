import type { LinkListItem } from '../../api/types';
import { formatDate, formatDateTime } from '../../lib/format';
import { LinkActions } from './LinkActions';
import { LinkStatusBadge } from './LinkStatus';
import { StatusToggle } from './StatusToggle';

interface LinkTableProps {
  links: LinkListItem[];
  togglingId: string | null;
  onToggle: (link: LinkListItem) => void;
  onEdit: (link: LinkListItem) => void;
  onDelete: (link: LinkListItem) => void;
  onShowQr: (link: LinkListItem) => void;
}

export function LinkTable({
  links,
  togglingId,
  onToggle,
  onEdit,
  onDelete,
  onShowQr,
}: LinkTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:block">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <caption className="sr-only">Your links</caption>
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">
                Link
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Clicks
              </th>
              <th scope="col" className="px-4 py-3">
                Dates
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {links.map((link) => (
              <tr key={link.id} className="align-top hover:bg-slate-50/70">
                <td className="min-w-[12rem] px-4 py-3">
                  <p className="break-all font-semibold text-slate-900" title={link.alias}>
                    {link.alias}
                  </p>
                  <a
                    href={link.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block truncate text-xs font-medium text-indigo-600 hover:underline"
                  >
                    {link.shortUrl}
                  </a>
                  <p
                    className="mt-1 max-w-[22rem] truncate text-xs text-slate-500"
                    title={link.destinationUrl}
                  >
                    {link.destinationUrl}
                  </p>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <div className="flex flex-col items-start gap-1.5">
                    <LinkStatusBadge link={link} />
                    <StatusToggle
                      checked={link.isActive}
                      disabled={togglingId === link.id}
                      label={`${link.isActive ? 'Disable' : 'Enable'} ${link.alias}`}
                      onChange={() => onToggle(link)}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">
                  {link.clickCount}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                  <p>
                    <span className="text-slate-400">Created</span> {formatDate(link.createdAt)}
                  </p>
                  <p className="mt-1">
                    <span className="text-slate-400">Expires</span>{' '}
                    {link.expiresAt ? formatDateTime(link.expiresAt) : 'Never'}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <LinkActions
                    compact
                    link={link}
                    onEdit={() => onEdit(link)}
                    onDelete={() => onDelete(link)}
                    onShowQr={() => onShowQr(link)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
