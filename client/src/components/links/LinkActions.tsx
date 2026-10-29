import type { SVGProps } from 'react';
import { Link } from 'react-router-dom';
import type { LinkListItem } from '../../api/types';
import { copyText } from '../../lib/clipboard';
import { buttonClassName } from '../../lib/styles';
import { useToast } from '../../toast/useToast';
import { Button } from '../Button';

const iconProps = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  className: 'h-4 w-4',
  'aria-hidden': true,
} as const satisfies SVGProps<SVGSVGElement>;

function AnalyticsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 16.5h14M5 13l3.5-4 3 2.5L16 6" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="5.5" height="5.5" rx="1" />
      <rect x="11.5" y="3" width="5.5" height="5.5" rx="1" />
      <rect x="3" y="11.5" width="5.5" height="5.5" rx="1" />
      <path d="M11.5 11.5h2v2h-2zM15 11.5h2M15 15h2v2M11.5 15v2" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg {...iconProps}>
      <rect x="7" y="7" width="9" height="9" rx="1.5" />
      <path d="M13 7V5.5A1.5 1.5 0 0 0 11.5 4h-6A1.5 1.5 0 0 0 4 5.5v6A1.5 1.5 0 0 0 5.5 13H7" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 16h3l8.5-8.5a2.12 2.12 0 0 0-3-3L4 13v3Z" />
      <path d="m11.5 5.5 3 3" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 6h12M8 6V4h4v2M6 6l.7 10h6.6L14 6M9 9v4M11 9v4" />
    </svg>
  );
}

interface LinkActionsProps {
  link: LinkListItem;
  onEdit: () => void;
  onDelete: () => void;
  onShowQr: () => void;
  compact?: boolean;
}

export function LinkActions({
  link,
  onEdit,
  onDelete,
  onShowQr,
  compact = false,
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
    return (
      <div className="flex items-center justify-end gap-1">
        <Link
          to={`/links/${link.id}/analytics`}
          aria-label={`Analytics for ${link.alias}`}
          title="Analytics"
          className={buttonClassName('ghost', 'icon')}
        >
          <AnalyticsIcon />
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Show QR code for ${link.alias}`}
          title="QR code"
          onClick={onShowQr}
        >
          <QrIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Copy ${link.alias} link`}
          title="Copy link"
          onClick={() => void handleCopy()}
        >
          <CopyIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Edit ${link.alias}`}
          title="Edit"
          onClick={onEdit}
        >
          <EditIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Delete ${link.alias}`}
          title="Delete"
          className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          onClick={onDelete}
        >
          <DeleteIcon />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link to={`/links/${link.id}/analytics`} className={buttonClassName('secondary', 'sm')}>
        Analytics
      </Link>
      <Button variant="secondary" size="sm" onClick={onShowQr}>
        QR
      </Button>
      <Button variant="secondary" size="sm" onClick={() => void handleCopy()}>
        Copy
      </Button>
      <Button variant="secondary" size="sm" onClick={onEdit}>
        Edit
      </Button>
      <Button variant="dangerGhost" size="sm" onClick={onDelete}>
        Delete
      </Button>
    </div>
  );
}
