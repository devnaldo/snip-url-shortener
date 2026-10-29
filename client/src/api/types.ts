export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface LinkDto {
  id: string;
  alias: string;
  shortUrl: string;
  destinationUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LinkListItem extends LinkDto {
  clickCount: number;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedLinks {
  links: LinkListItem[];
  pagination: Pagination;
}

export interface CreateLinkInput {
  destinationUrl: string;
  alias?: string;
  expiresAt?: string;
}

export interface UpdateLinkInput {
  destinationUrl?: string;
  expiresAt?: string | null;
  isActive?: boolean;
}

export type AnalyticsRange = '7d' | '30d' | '90d';

export interface AnalyticsTotals {
  totalClicks: number;
  uniqueVisitors: number;
}

export interface DailyClicks {
  date: string;
  clicks: number;
}

export interface ReferrerClicks {
  referrer: string;
  clicks: number;
}

export interface DeviceClicks {
  deviceType: string;
  clicks: number;
}

export interface BrowserClicks {
  browser: string;
  clicks: number;
}

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

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}
