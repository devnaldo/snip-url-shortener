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
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
      aria-label="Pagination"
    >
      <p className="text-sm text-slate-600">
        Page <span className="font-medium text-slate-900">{page}</span> of{' '}
        <span className="font-medium text-slate-900">{totalPages}</span>
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
