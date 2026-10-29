import { copyText } from '../../lib/clipboard';
import { useToast } from '../../toast/useToast';
import type { LinkListItem } from '../../api/types';
import { Button } from '../Button';

interface LinkActionsProps {
  link: LinkListItem;
  onEdit: () => void;
  onDelete: () => void;
}

export function LinkActions({ link, onEdit, onDelete }: LinkActionsProps) {
  const { showToast } = useToast();

  async function handleCopy() {
    const copied = await copyText(link.shortUrl);
    showToast(
      copied ? 'Short link copied to clipboard.' : 'Could not copy the link. Try again.',
      copied ? 'success' : 'error',
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
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
