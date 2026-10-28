import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { Link } from '../src/db/schema.js';
import { AUTH_COOKIE_NAME } from '../src/lib/auth-cookie.js';
import { signAuthToken } from '../src/lib/auth-token.js';
import {
  getAnalyticsTotals,
  getBrowserSplit,
  getClicksOverTime,
  getDeviceSplit,
  getTopReferrers,
} from '../src/repositories/analytics.repository.js';
import { findLinkForUser } from '../src/repositories/links.repository.js';

vi.mock('../src/repositories/links.repository.js', () => ({
  insertLink: vi.fn(),
  findLinksByUser: vi.fn(),
  countLinksByUser: vi.fn(),
  findLinkByAlias: vi.fn(),
  findLinkForUser: vi.fn(),
  updateLinkForUser: vi.fn(),
  deleteLinkForUser: vi.fn(),
}));

vi.mock('../src/repositories/analytics.repository.js', () => ({
  getAnalyticsTotals: vi.fn(),
  getClicksOverTime: vi.fn(),
  getTopReferrers: vi.fn(),
  getDeviceSplit: vi.fn(),
  getBrowserSplit: vi.fn(),
}));

const findLinkForUserMock = vi.mocked(findLinkForUser);
const getAnalyticsTotalsMock = vi.mocked(getAnalyticsTotals);
const getClicksOverTimeMock = vi.mocked(getClicksOverTime);
const getTopReferrersMock = vi.mocked(getTopReferrers);
const getDeviceSplitMock = vi.mocked(getDeviceSplit);
const getBrowserSplitMock = vi.mocked(getBrowserSplit);

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '33333333-3333-4333-8333-333333333333';
const LINK_ID = '22222222-2222-4222-8222-222222222222';

interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}

interface AnalyticsBody {
  linkId: string;
  range: string;
  from: string;
  to: string;
  totals: { totalClicks: number; uniqueVisitors: number };
  clicksOverTime: Array<{ date: string; clicks: number }>;
  topReferrers: Array<{ referrer: string; clicks: number }>;
  deviceSplit: Array<{ deviceType: string; clicks: number }>;
  browserSplit: Array<{ browser: string; clicks: number }>;
}

let app: Express;

beforeEach(() => {
  vi.resetAllMocks();
  app = createApp();
});

function authCookie(userId: string = USER_ID): string {
  return `${AUTH_COOKIE_NAME}=${signAuthToken(userId)}`;
}

function makeLink(): Link {
  return {
    id: LINK_ID,
    userId: USER_ID,
    alias: 'abc1234',
    destinationUrl: 'https://example.com',
    isActive: true,
    expiresAt: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  };
}

function stubAnalytics(): void {
  getAnalyticsTotalsMock.mockResolvedValue({ totalClicks: 3, uniqueVisitors: 2 });
  getClicksOverTimeMock.mockResolvedValue([
    { date: '2026-10-22', clicks: 0 },
    { date: '2026-10-23', clicks: 0 },
    { date: '2026-10-24', clicks: 0 },
    { date: '2026-10-25', clicks: 0 },
    { date: '2026-10-26', clicks: 0 },
    { date: '2026-10-27', clicks: 1 },
    { date: '2026-10-28', clicks: 2 },
  ]);
  getTopReferrersMock.mockResolvedValue([
    { referrer: 'news.example.org', clicks: 2 },
    { referrer: 'Direct', clicks: 1 },
  ]);
  getDeviceSplitMock.mockResolvedValue([
    { deviceType: 'desktop', clicks: 2 },
    { deviceType: 'mobile', clicks: 1 },
  ]);
  getBrowserSplitMock.mockResolvedValue([
    { browser: 'Chrome', clicks: 2 },
    { browser: 'Mobile Safari', clicks: 1 },
  ]);
}

describe('GET /api/links/:id/analytics', () => {
  it('requires authentication', async () => {
    const response = await request(app).get(`/api/links/${LINK_ID}/analytics`);

    expect(response.status).toBe(401);
    expect(findLinkForUserMock).not.toHaveBeenCalled();
  });

  it('returns totals, gap-filled days, referrers, and splits for the last 7 days', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-28T15:30:00.000Z'));

    try {
      findLinkForUserMock.mockResolvedValue(makeLink());
      stubAnalytics();

      const response = await request(app)
        .get(`/api/links/${LINK_ID}/analytics`)
        .set('Cookie', authCookie());
      const body = response.body as AnalyticsBody;

      expect(response.status).toBe(200);
      expect(body).toMatchObject({
        linkId: LINK_ID,
        range: '7d',
        from: '2026-10-22T00:00:00.000Z',
        to: '2026-10-29T00:00:00.000Z',
        totals: { totalClicks: 3, uniqueVisitors: 2 },
        topReferrers: [
          { referrer: 'news.example.org', clicks: 2 },
          { referrer: 'Direct', clicks: 1 },
        ],
      });
      expect(body.clicksOverTime).toHaveLength(7);
      expect(body.clicksOverTime[0]).toEqual({ date: '2026-10-22', clicks: 0 });
      expect(findLinkForUserMock).toHaveBeenCalledWith(LINK_ID, USER_ID);

      const filters = getAnalyticsTotalsMock.mock.calls[0]?.[0];

      expect(filters).toEqual({
        linkId: LINK_ID,
        from: new Date('2026-10-22T00:00:00.000Z'),
        to: new Date('2026-10-29T00:00:00.000Z'),
      });
      expect(getClicksOverTimeMock).toHaveBeenCalledWith(filters);
      expect(getTopReferrersMock).toHaveBeenCalledWith(filters);
      expect(getDeviceSplitMock).toHaveBeenCalledWith(filters);
      expect(getBrowserSplitMock).toHaveBeenCalledWith(filters);
    } finally {
      vi.useRealTimers();
    }
  });

  it.each([
    ['30d', 29],
    ['90d', 89],
  ])('supports the %s range', async (range, daysBack) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-28T15:30:00.000Z'));

    try {
      findLinkForUserMock.mockResolvedValue(makeLink());
      stubAnalytics();

      const response = await request(app)
        .get(`/api/links/${LINK_ID}/analytics?range=${range}`)
        .set('Cookie', authCookie());
      const body = response.body as AnalyticsBody;
      const expectedFrom = new Date(Date.UTC(2026, 9, 28) - daysBack * 24 * 60 * 60 * 1_000);

      expect(response.status).toBe(200);
      expect(body.range).toBe(range);
      expect(body.from).toBe(expectedFrom.toISOString());
      expect(body.to).toBe('2026-10-29T00:00:00.000Z');
    } finally {
      vi.useRealTimers();
    }
  });

  it('rejects an unsupported range', async () => {
    const response = await request(app)
      .get(`/api/links/${LINK_ID}/analytics?range=1d`)
      .set('Cookie', authCookie());
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields?.range).toEqual(expect.any(String));
    expect(findLinkForUserMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed link id', async () => {
    const response = await request(app)
      .get('/api/links/not-a-uuid/analytics')
      .set('Cookie', authCookie());
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.fields?.id).toEqual(expect.any(String));
    expect(findLinkForUserMock).not.toHaveBeenCalled();
  });

  it('returns 404 for a link owned by another user without querying clicks', async () => {
    findLinkForUserMock.mockResolvedValue(undefined);

    const response = await request(app)
      .get(`/api/links/${LINK_ID}/analytics`)
      .set('Cookie', authCookie(OTHER_USER_ID));
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('LINK_NOT_FOUND');
    expect(findLinkForUserMock).toHaveBeenCalledWith(LINK_ID, OTHER_USER_ID);
    expect(getAnalyticsTotalsMock).not.toHaveBeenCalled();
    expect(getClicksOverTimeMock).not.toHaveBeenCalled();
  });
});
