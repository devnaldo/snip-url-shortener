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

const HEAD_CLASS =
  'px-3 py-2.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em] text-subtle';

export function LinkTable({
  links,
  togglingId,
  onToggle,
  onEdit,
  onDelete,
  onShowQr,
}: LinkTableProps) {
  return (
    <div className="hidden overflow-hidden rounded-lg border border-line bg-surface lg:block">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-left text-[0.75rem]">
          <caption className="sr-only">Your links</caption>
          <colgroup>
            <col />
            <col className="w-[6.5rem]" />
            <col className="w-[4rem]" />
            <col className="w-[10rem]" />
            <col className="w-[11rem]" />
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-surface-2/60">
              <th scope="col" className={HEAD_CLASS}>
                Link
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Status
              </th>
              <th scope="col" className={`${HEAD_CLASS} text-right`}>
                Clicks
              </th>
              <th scope="col" className={HEAD_CLASS}>
                Dates
              </th>
              <th scope="col" className={`${HEAD_CLASS} text-right`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {links.map((link) => (
              <tr
                key={link.id}
                className="border-b border-line align-top transition-colors duration-150 last:border-0 hover:bg-surface-2/50"
              >
                <td className="px-3 py-3">
                  <p
                    className="w-full truncate font-mono text-[0.8125rem] font-semibold text-ink"
                    title={link.alias}
                  >
                    {link.alias}
                  </p>
                  <a
                    href={link.shortUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 block w-full truncate font-mono text-[0.6875rem] text-accent hover:underline"
                  >
                    {link.shortUrl}
                  </a>
                  <p
                    className="mt-1.5 w-full truncate text-[0.6875rem] text-subtle"
                    title={link.destinationUrl}
                  >
                    {link.destinationUrl}
                  </p>
                </td>
                <td className="whitespace-nowrap px-3 py-3">
                  <div className="flex flex-col items-start gap-2">
                    <LinkStatusBadge link={link} />
                    <StatusToggle
                      checked={link.isActive}
                      disabled={togglingId === link.id}
                      label={`${link.isActive ? 'Disable' : 'Enable'} ${link.alias}`}
                      onChange={() => onToggle(link)}
                    />
                  </div>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-right">
                  <span className="font-terminal text-xl leading-none text-ink">
                    {link.clickCount}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-3 text-[0.6875rem] leading-relaxed text-muted">
                  <p title={formatDate(link.createdAt)}>
                    <span className="text-subtle">Created </span>
                    {formatDate(link.createdAt)}
                  </p>
                  <p
                    className="mt-1"
                    title={link.expiresAt ? formatDateTime(link.expiresAt) : undefined}
                  >
                    <span className="text-subtle">Expires </span>
                    {link.expiresAt ? formatDate(link.expiresAt) : 'Never'}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <LinkActions
                    compact
                    dense
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
