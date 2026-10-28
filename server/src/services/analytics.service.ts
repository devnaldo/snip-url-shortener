import { AppError } from '../errors/app-error.js';
import { analyticsWindow } from '../lib/analytics-window.js';
import type { AnalyticsRange } from '../lib/analytics-window.js';
import {
  getAnalyticsTotals,
  getBrowserSplit,
  getClicksOverTime,
  getDeviceSplit,
  getTopReferrers,
} from '../repositories/analytics.repository.js';
import type {
  AnalyticsTotals,
  BrowserClicks,
  DailyClicks,
  DeviceClicks,
  ReferrerClicks,
} from '../repositories/analytics.repository.js';
import { findLinkForUser } from '../repositories/links.repository.js';

export interface LinkAnalytics {
  linkId: string;
  range: AnalyticsRange;
  from: string;
  to: string;
  totals: AnalyticsTotals;
  clicksOverTime: DailyClicks[];
  topReferrers: ReferrerClicks[];
  deviceSplit: DeviceClicks[];
  browserSplit: BrowserClicks[];
}

export async function getLinkAnalytics(
  userId: string,
  linkId: string,
  range: AnalyticsRange,
): Promise<LinkAnalytics> {
  const link = await findLinkForUser(linkId, userId);

  if (!link) {
    throw new AppError(404, 'LINK_NOT_FOUND', 'Link not found.');
  }

  const { from, to } = analyticsWindow(range);
  const filters = { linkId: link.id, from, to };

  const [totals, clicksOverTime, topReferrers, deviceSplit, browserSplit] = await Promise.all([
    getAnalyticsTotals(filters),
    getClicksOverTime(filters),
    getTopReferrers(filters),
    getDeviceSplit(filters),
    getBrowserSplit(filters),
  ]);

  return {
    linkId: link.id,
    range,
    from: from.toISOString(),
    to: to.toISOString(),
    totals,
    clicksOverTime,
    topReferrers,
    deviceSplit,
    browserSplit,
  };
}
