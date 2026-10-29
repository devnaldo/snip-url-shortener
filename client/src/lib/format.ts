export function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

export function formatDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/** Convert an ISO timestamp to the local value expected by datetime-local inputs. */
export function toDateTimeLocalValue(iso: string | null): string {
  if (!iso) {
    return '';
  }

  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

/** Convert a datetime-local value to an ISO timestamp; empty means "no expiry". */
export function fromDateTimeLocalValue(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Format a YYYY-MM-DD analytics bucket without shifting it across time zones. */
export function formatDay(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(parsed);
}

export function truncateMiddle(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }

  const head = Math.ceil((maxLength - 1) / 2);
  const tail = Math.floor((maxLength - 1) / 2);
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
