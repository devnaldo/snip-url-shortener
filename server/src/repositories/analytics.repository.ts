import { sql } from 'drizzle-orm';
import { db } from '../db/client.js';

export const TOP_REFERRERS_LIMIT = 10;

export interface AnalyticsFilters {
  linkId: string;
  from: Date;
  to: Date;
}

export type AnalyticsTotals = {
  totalClicks: number;
  uniqueVisitors: number;
};

export type DailyClicks = {
  date: string;
  clicks: number;
};

export type ReferrerClicks = {
  referrer: string;
  clicks: number;
};

export type DeviceClicks = {
  deviceType: string;
  clicks: number;
};

export type BrowserClicks = {
  browser: string;
  clicks: number;
};

/**
 * Totals for one link within the half-open window [from, to).
 */
export async function getAnalyticsTotals(filters: AnalyticsFilters): Promise<AnalyticsTotals> {
  const result = await db.execute<AnalyticsTotals>(sql`
    select
      count(*)::int as "totalClicks",
      count(distinct visitor_hash)::int as "uniqueVisitors"
    from clicks
    where link_id = ${filters.linkId}
      and clicked_at >= ${filters.from}
      and clicked_at < ${filters.to}
  `);

  return result.rows[0] ?? { totalClicks: 0, uniqueVisitors: 0 };
}

/**
 * One row per UTC day in the window, including days with no clicks.
 * generate_series produces the calendar so the application never loops over
 * dates or fills gaps in memory.
 */
export async function getClicksOverTime(filters: AnalyticsFilters): Promise<DailyClicks[]> {
  const result = await db.execute<DailyClicks>(sql`
    with days as (
      select generate_series(
        ${filters.from}::timestamptz,
        ${filters.to}::timestamptz - interval '1 day',
        interval '1 day'
      ) as day
    )
    select
      to_char(days.day at time zone 'UTC', 'YYYY-MM-DD') as "date",
      count(clicks.id)::int as "clicks"
    from days
    left join clicks
      on clicks.link_id = ${filters.linkId}
      and clicks.clicked_at >= days.day
      and clicks.clicked_at < days.day + interval '1 day'
    group by days.day
    order by days.day
  `);

  return result.rows;
}

/** Top 10 referrer hosts, with missing referrers grouped as `Direct`. */
export async function getTopReferrers(filters: AnalyticsFilters): Promise<ReferrerClicks[]> {
  const result = await db.execute<ReferrerClicks>(sql`
    select
      coalesce(nullif(referrer_host, ''), 'Direct') as "referrer",
      count(*)::int as "clicks"
    from clicks
    where link_id = ${filters.linkId}
      and clicked_at >= ${filters.from}
      and clicked_at < ${filters.to}
    group by coalesce(nullif(referrer_host, ''), 'Direct')
    order by "clicks" desc, "referrer" asc
    limit ${TOP_REFERRERS_LIMIT}
  `);

  return result.rows;
}

export async function getDeviceSplit(filters: AnalyticsFilters): Promise<DeviceClicks[]> {
  const result = await db.execute<DeviceClicks>(sql`
    select
      device_type as "deviceType",
      count(*)::int as "clicks"
    from clicks
    where link_id = ${filters.linkId}
      and clicked_at >= ${filters.from}
      and clicked_at < ${filters.to}
    group by device_type
    order by "clicks" desc, "deviceType" asc
  `);

  return result.rows;
}

export async function getBrowserSplit(filters: AnalyticsFilters): Promise<BrowserClicks[]> {
  const result = await db.execute<BrowserClicks>(sql`
    select
      browser,
      count(*)::int as "clicks"
    from clicks
    where link_id = ${filters.linkId}
      and clicked_at >= ${filters.from}
      and clicked_at < ${filters.to}
    group by browser
    order by "clicks" desc, "browser" asc
  `);

  return result.rows;
}
