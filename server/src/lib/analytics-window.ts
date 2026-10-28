export const ANALYTICS_RANGES = ['7d', '30d', '90d'] as const;

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export const ANALYTICS_RANGE_DAYS: Record<AnalyticsRange, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
};

const DAY_MS = 24 * 60 * 60 * 1_000;

export interface AnalyticsWindow {
  days: number;
  from: Date;
  to: Date;
}

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * The window covers the current UTC day plus the preceding `days - 1` days.
 * `from` is inclusive (UTC midnight) and `to` is exclusive (UTC midnight
 * tomorrow), which matches the day buckets returned by the analytics query.
 */
export function analyticsWindow(range: AnalyticsRange, now: Date = new Date()): AnalyticsWindow {
  const days = ANALYTICS_RANGE_DAYS[range];
  const today = startOfUtcDay(now);

  return {
    days,
    from: new Date(today - (days - 1) * DAY_MS),
    to: new Date(today + DAY_MS),
  };
}
