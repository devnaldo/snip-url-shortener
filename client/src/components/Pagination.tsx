import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
}

export function Pagination({ page, totalPages, onChange, disabled = false }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4"
      aria-label="Pagination"
    >
      <p className="font-mono text-[0.6875rem] uppercase tracking-[0.1em] text-subtle">
        Page <span className="text-ink">{page}</span> / {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={disabled || page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
