import { Link } from 'react-router-dom';
import type { LinkListItem } from '../../api/types';
import { copyText } from '../../lib/clipboard';
import { buttonClassName } from '../../lib/styles';
import { useToast } from '../../toast/useToast';
import { Button } from '../Button';
import { ChartIcon, CopyIcon, PencilIcon, QrIcon, TrashIcon } from '../Icons';

interface LinkActionsProps {
  link: LinkListItem;
  onEdit: () => void;
  onDelete: () => void;
  onShowQr: () => void;
  compact?: boolean;
  spread?: boolean;
  dense?: boolean;
}

export function LinkActions({
  link,
  onEdit,
  onDelete,
  onShowQr,
  compact = false,
  spread = false,
  dense = false,
}: LinkActionsProps) {
  const { showToast } = useToast();

  async function handleCopy() {
    const copied = await copyText(link.shortUrl);
    showToast(
      copied ? 'Short link copied to clipboard.' : 'Could not copy the link. Try again.',
      copied ? 'success' : 'error',
    );
  }

  if (compact) {
    const iconSize = dense ? 'iconSm' : 'icon';
    const iconClass = dense ? 'h-3.5 w-3.5' : 'h-4 w-4';

    return (
      <div
        className={
          spread
            ? 'flex items-center justify-between gap-1'
            : 'flex items-center justify-end gap-0.5'
        }
      >
        <Link
          to={`/links/${link.id}/analytics`}
          aria-label={`Analytics for ${link.alias}`}
          title="Analytics"
          className={buttonClassName('ghost', iconSize, 'shrink-0')}
        >
          <ChartIcon className={iconClass} />
        </Link>
        <Button
          variant="ghost"
          size={iconSize}
          className="shrink-0"
          aria-label={`Show QR code for ${link.alias}`}
          title="QR code"
          onClick={onShowQr}
        >
          <QrIcon className={iconClass} />
        </Button>
        <Button
          variant="ghost"
          size={iconSize}
          className="shrink-0"
          aria-label={`Copy ${link.alias} link`}
          title="Copy link"
          onClick={() => void handleCopy()}
        >
          <CopyIcon className={iconClass} />
        </Button>
        <Button
          variant="ghost"
          size={iconSize}
          className="shrink-0"
          aria-label={`Edit ${link.alias}`}
          title="Edit"
          onClick={onEdit}
        >
          <PencilIcon className={iconClass} />
        </Button>
        <Button
          variant="ghost"
          size={iconSize}
          className="shrink-0 text-subtle hover:bg-danger-soft hover:text-danger"
          aria-label={`Delete ${link.alias}`}
          title="Delete"
          onClick={onDelete}
        >
          <TrashIcon className={iconClass} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Link to={`/links/${link.id}/analytics`} className={buttonClassName('secondary', 'sm')}>
        <ChartIcon className="h-3.5 w-3.5" />
        Analytics
      </Link>
      <Button variant="secondary" size="sm" onClick={onShowQr}>
        <QrIcon className="h-3.5 w-3.5" />
        QR
      </Button>
      <Button variant="secondary" size="sm" onClick={() => void handleCopy()}>
        <CopyIcon className="h-3.5 w-3.5" />
        Copy
      </Button>
      <Button variant="secondary" size="sm" onClick={onEdit}>
        <PencilIcon className="h-3.5 w-3.5" />
        Edit
      </Button>
      <Button variant="dangerGhost" size="sm" onClick={onDelete}>
        <TrashIcon className="h-3.5 w-3.5" />
        Delete
      </Button>
    </div>
  );
}
