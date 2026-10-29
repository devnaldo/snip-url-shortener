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
          <thead className="bg-slate-50 text-xs font-medium uppercase tracking-wide text-slate-500">
            <tr>
              <th scope="col" className="px-4 py-3">
                Link
              </th>
              <th scope="col" className="px-4 py-3">
                Destination
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Clicks
              </th>
              <th scope="col" className="px-4 py-3">
                Created
              </th>
              <th scope="col" className="px-4 py-3">
                Expires
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {links.map((link) => (
              <tr key={link.id} className="align-top hover:bg-slate-50/70">
                <td className="max-w-[14rem] px-4 py-3">
                  <p className="truncate font-semibold text-slate-900">{link.alias}</p>
                  <a
                    href={link.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block truncate text-xs font-medium text-indigo-600 hover:underline"
                  >
                    {link.shortUrl}
                  </a>
                </td>
                <td className="max-w-[16rem] px-4 py-3">
                  <p className="truncate text-slate-700" title={link.destinationUrl}>
                    {link.destinationUrl}
                  </p>
                </td>
                <td className="px-4 py-3">
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
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {formatDate(link.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                  {link.expiresAt ? formatDateTime(link.expiresAt) : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <LinkActions
                      link={link}
                      onEdit={() => onEdit(link)}
                      onDelete={() => onDelete(link)}
                      onShowQr={() => onShowQr(link)}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
