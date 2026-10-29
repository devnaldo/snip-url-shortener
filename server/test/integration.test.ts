import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, getClickQueue } from '../src/app.js';
import { closeDb } from '../src/db/client.js';
import type { NewClick } from '../src/db/schema.js';
import { RESERVED_ALIASES, validateAlias } from '../src/lib/alias.js';
import { parseUserAgent } from '../src/lib/click-metadata.js';
import { ClickQueue } from '../src/lib/click-queue.js';
import { validateDestinationUrl } from '../src/lib/destination-url.js';
import { clearRedirectCache, getCachedLink } from '../src/lib/redirect-cache.js';
import { getAnalyticsTotals, getClicksOverTime } from '../src/repositories/analytics.repository.js';
import { insertClicks } from '../src/repositories/clicks.repository.js';
import {
  authCookieFor,
  countClicks,
  countLinks,
  createTestLink,
  createTestUser,
  insertTestClick,
  listClicks,
  resetDatabase,
} from './helpers/db.js';

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

interface LinkBody {
  id: string;
  alias: string;
  shortUrl: string;
  destinationUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LinkResponse {
  link: LinkBody;
}

interface ListResponse {
  links: LinkBody[];
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

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

let app: Express;

beforeEach(async () => {
  await resetDatabase();
  clearRedirectCache();
  app = createApp();
});

afterAll(async () => {
  await closeDb();
});

async function createUserWithCookie(email = 'user@example.com'): Promise<{
  userId: string;
  cookie: string;
}> {
  const user = await createTestUser(email);

  return { userId: user.id, cookie: authCookieFor(user.id) };
}

function deferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
} {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

describe('(1) destination URL validation', () => {
  it.each([
    ['https', 'https://example.com'],
    ['http', 'http://example.com'],
    ['https with path and query', 'https://example.com/path?query=1#fragment'],
    ['subdomain and port', 'https://sub.example.com:8443/path'],
    ['uppercase scheme and host', 'HTTPS://EXAMPLE.COM'],
    ['public IPv4 literal', 'http://8.8.8.8'],
  ])('accepts a %s destination through the API', async (_label, destinationUrl) => {
    const { cookie } = await createUserWithCookie();

    const response = await request(app)
      .post('/api/links')
      .set('Cookie', cookie)
      .send({ destinationUrl });

    expect(response.status).toBe(201);
    expect((response.body as LinkResponse).link.destinationUrl).toBe(destinationUrl);
  });

  it.each([
    ['javascript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:text/plain,hello'],
    ['ftp scheme', 'ftp://example.com/file'],
    ['file scheme', 'file:///etc/passwd'],
    ['embedded credentials', 'https://user:pass@example.com'],
    ['username only credentials', 'https://user@example.com'],
    ['own host', 'http://localhost:3000/loop'],
    ['localhost', 'http://localhost:4000'],
    ['localhost subdomain', 'http://app.localhost'],
    ['loopback IPv4', 'http://127.0.0.1'],
    ['loopback IPv6', 'http://[::1]'],
    ['private 10/8', 'http://10.1.2.3'],
    ['private 172.16/12', 'http://172.16.0.1'],
    ['private 192.168/16', 'http://192.168.1.1'],
    ['relative URL', '/path'],
    ['missing scheme', 'example.com'],
  ])('rejects a %s destination through the API', async (_label, destinationUrl) => {
    const { cookie } = await createUserWithCookie();

    const response = await request(app)
      .post('/api/links')
      .set('Cookie', cookie)
      .send({ destinationUrl });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields?.destinationUrl).toEqual(expect.any(String));
    expect(await countLinks()).toBe(0);
  });

  it('rejects destinations longer than 2048 characters', () => {
    const result = validateDestinationUrl(`https://example.com/${'a'.repeat(2_048)}`);

    expect(result.valid).toBe(false);
  });
});

describe('(2) alias validation', () => {
  it.each(['abc', 'ABC', 'a-b_c', '123', 'a'.repeat(32)])('accepts %s', (alias) => {
    expect(validateAlias(alias)).toEqual({ valid: true });
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(33)],
    ['space', 'bad alias'],
    ['slash', 'bad/alias'],
    ['dot', 'bad.alias'],
    ['non-ASCII', 'ábc'],
    ['reserved', 'api'],
    ['reserved uppercase', 'API'],
    ['reserved mixed case', 'Admin'],
    ['reserved with dot', 'favicon.ico'],
  ])('rejects %s', (_label, alias) => {
    expect(validateAlias(alias).valid).toBe(false);
  });

  it('exposes the reserved list from the specification', () => {
    expect(RESERVED_ALIASES).toEqual([
      'api',
      'health',
      'login',
      'register',
      'dashboard',
      'admin',
      'static',
      'assets',
      'favicon.ico',
      'robots.txt',
    ]);
  });

  it('creates a link with a valid custom alias', async () => {
    const { cookie } = await createUserWithCookie();

    const response = await request(app)
      .post('/api/links')
      .set('Cookie', cookie)
      .send({ destinationUrl: 'https://example.com', alias: 'My-Alias_1' });

    expect(response.status).toBe(201);
    expect((response.body as LinkResponse).link.alias).toBe('My-Alias_1');
  });

  it.each([
    ['too short', 'ab'],
    ['too long', 'a'.repeat(33)],
    ['invalid characters', 'bad alias'],
    ['reserved', 'admin'],
    ['reserved uppercase', 'API'],
  ])('rejects a %s alias through the API', async (_label, alias) => {
    const { cookie } = await createUserWithCookie();

    const response = await request(app)
      .post('/api/links')
      .set('Cookie', cookie)
      .send({ destinationUrl: 'https://example.com', alias });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields?.alias).toEqual(expect.any(String));
    expect(await countLinks()).toBe(0);
  });

  it('rejects a duplicate alias with 409 while aliases stay case-sensitive', async () => {
    const { cookie } = await createUserWithCookie();

    const first = await request(app)
      .post('/api/links')
      .set('Cookie', cookie)
      .send({ destinationUrl: 'https://example.com', alias: 'Taken' });
    const duplicate = await request(app)
      .post('/api/links')
      .set('Cookie', cookie)
      .send({ destinationUrl: 'https://example.com', alias: 'Taken' });
    const differentCase = await request(app)
      .post('/api/links')
      .set('Cookie', cookie)
      .send({ destinationUrl: 'https://example.com', alias: 'taken' });

    expect(first.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect((duplicate.body as ApiErrorBody).error.code).toBe('ALIAS_TAKEN');
    expect(differentCase.status).toBe(201);
  });
});

describe('(3) user-agent parsing', () => {
  it('maps desktop, mobile, tablet, and bot agents to device types', () => {
    expect(parseUserAgent(CHROME_UA)).toEqual({
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
    });
    expect(parseUserAgent(IPHONE_UA)).toMatchObject({
      deviceType: 'mobile',
      browser: 'Mobile Safari',
      os: 'iOS',
    });
    expect(parseUserAgent(IPAD_UA)).toMatchObject({ deviceType: 'tablet', os: 'iOS' });
    expect(parseUserAgent(GOOGLEBOT_UA).deviceType).toBe('bot');
  });

  it('falls back to unknown for an empty agent', () => {
    expect(parseUserAgent('')).toEqual({
      deviceType: 'unknown',
      browser: 'Unknown',
      os: 'Unknown',
    });
  });
});

describe('(4) expiry and disabled links', () => {
  it('returns 410 for an expired link and records no click', async () => {
    const user = await createTestUser();
    const link = await createTestLink({
      userId: user.id,
      alias: 'expired1',
      expiresAt: new Date(Date.now() - 60_000),
    });

    const response = await request(app).get('/expired1');

    expect(response.status).toBe(410);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.text).toContain('expired');

    await getClickQueue(app).flush();
    expect(await countClicks(link.id)).toBe(0);
  });

  it('returns 410 for a disabled link and records no click', async () => {
    const user = await createTestUser();
    const link = await createTestLink({
      userId: user.id,
      alias: 'disabled1',
      isActive: false,
    });

    const response = await request(app).get('/disabled1');

    expect(response.status).toBe(410);
    expect(response.text).toContain('disabled');
    expect(response.text).not.toContain('expired');

    await getClickQueue(app).flush();
    expect(await countClicks(link.id)).toBe(0);
  });

  it('returns 404 for an unknown alias and records no click', async () => {
    const response = await request(app).get('/missing1');

    expect(response.status).toBe(404);
    expect(response.text).toContain('missing1');

    await getClickQueue(app).flush();
    expect(await countClicks()).toBe(0);
  });

  it('redirects a link whose expiry is still in the future', async () => {
    const { cookie } = await createUserWithCookie();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1_000).toISOString();

    const created = await request(app)
      .post('/api/links')
      .set('Cookie', cookie)
      .send({ destinationUrl: 'https://example.com', alias: 'future1', expiresAt });

    const response = await request(app).get('/future1');

    expect(created.status).toBe(201);
    expect(response.status).toBe(302);
    expect(response.headers['location']).toBe('https://example.com');
  });
});

describe('(5) link-creation rate limiting', () => {
  it('returns 429 with Retry-After after 20 creations for one user', async () => {
    const { userId, cookie } = await createUserWithCookie();

    for (let index = 0; index < 20; index += 1) {
      const response = await request(app)
        .post('/api/links')
        .set('Cookie', cookie)
        .send({ destinationUrl: `https://example.com/${index}` });

      expect(response.status).toBe(201);
    }

    const limited = await request(app)
      .post('/api/links')
      .set('Cookie', cookie)
      .send({ destinationUrl: 'https://example.com/blocked' });
    const body = limited.body as ApiErrorBody;

    expect(limited.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after']).toMatch(/^\d+$/);
    expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
    expect(await countLinks(userId)).toBe(20);

    // Reading the list is not limited.
    const list = await request(app).get('/api/links').set('Cookie', cookie);
    expect(list.status).toBe(200);
  });

  it('keys the limit by user, so another user is unaffected', async () => {
    const owner = await createUserWithCookie('owner@example.com');
    const other = await createUserWithCookie('other@example.com');

    for (let index = 0; index < 20; index += 1) {
      await request(app)
        .post('/api/links')
        .set('Cookie', owner.cookie)
        .send({ destinationUrl: `https://example.com/owner/${index}` });
    }

    const otherUser = await request(app)
      .post('/api/links')
      .set('Cookie', other.cookie)
      .send({ destinationUrl: 'https://example.com/other' });
    const ownerAgain = await request(app)
      .post('/api/links')
      .set('Cookie', owner.cookie)
      .send({ destinationUrl: 'https://example.com/owner/blocked' });

    expect(otherUser.status).toBe(201);
    expect((ownerAgain.body as ApiErrorBody).error.code).toBe('RATE_LIMITED');
    expect(await countLinks(owner.userId)).toBe(20);
    expect(await countLinks(other.userId)).toBe(1);
  });
});

describe('(6) link ownership', () => {
  it('hides another user link from read, list, edit, delete, and analytics', async () => {
    const owner = await createUserWithCookie('owner@example.com');
    const intruder = await createUserWithCookie('intruder@example.com');
    const link = await createTestLink({
      userId: owner.userId,
      alias: 'private1',
      destinationUrl: 'https://owner.example.com',
    });

    const read = await request(app).get(`/api/links/${link.id}`).set('Cookie', intruder.cookie);
    const list = await request(app).get('/api/links').set('Cookie', intruder.cookie);
    const update = await request(app)
      .patch(`/api/links/${link.id}`)
      .set('Cookie', intruder.cookie)
      .send({ destinationUrl: 'https://attacker.example.com' });
    const remove = await request(app)
      .delete(`/api/links/${link.id}`)
      .set('Cookie', intruder.cookie);
    const analytics = await request(app)
      .get(`/api/links/${link.id}/analytics`)
      .set('Cookie', intruder.cookie);

    expect(read.status).toBe(404);
    expect((read.body as ApiErrorBody).error.code).toBe('LINK_NOT_FOUND');
    expect((list.body as ListResponse).links).toEqual([]);
    expect(update.status).toBe(404);
    expect((update.body as ApiErrorBody).error.code).toBe('LINK_NOT_FOUND');
    expect(remove.status).toBe(404);
    expect((remove.body as ApiErrorBody).error.code).toBe('LINK_NOT_FOUND');
    expect(analytics.status).toBe(404);

    const ownerRead = await request(app).get(`/api/links/${link.id}`).set('Cookie', owner.cookie);

    expect(ownerRead.status).toBe(200);
    expect((ownerRead.body as LinkResponse).link.destinationUrl).toBe('https://owner.example.com');
  });
});

describe('(7) redirect responds before the click is persisted', () => {
  it('returns the 302 while the queue insert is still blocked', async () => {
    const user = await createTestUser();
    const link = await createTestLink({
      userId: user.id,
      alias: 'fast1',
      destinationUrl: 'https://example.com/fast',
    });

    const insertStarted = deferred();
    const releaseInsert = deferred();
    let insertCalls = 0;

    const queue = new ClickQueue({
      maxBatchSize: 1,
      flushIntervalMs: 60_000,
      insert: async (events: NewClick[]) => {
        insertCalls += 1;
        insertStarted.resolve();
        await releaseInsert.promise;
        await insertClicks(events);
      },
    });

    app.locals.clickQueue = queue;

    const response = await request(app).get('/fast1').set('User-Agent', CHROME_UA);

    // The response is complete even though the insert has not finished.
    expect(response.status).toBe(302);
    expect(response.headers['location']).toBe('https://example.com/fast');

    await insertStarted.promise;
    expect(insertCalls).toBe(1);
    expect(await countClicks(link.id)).toBe(0);

    releaseInsert.resolve();
    await queue.flush();

    expect(await countClicks(link.id)).toBe(1);
  });
});

describe('(8) click persistence', () => {
  it('eventually stores one click with the parsed fields and a visitor hash', async () => {
    const user = await createTestUser();
    const link = await createTestLink({
      userId: user.id,
      alias: 'click1',
      destinationUrl: 'https://example.com/click',
    });

    const before = Date.now();
    const response = await request(app)
      .get('/click1')
      .set('User-Agent', IPHONE_UA)
      .set('Referer', 'https://news.example.org/articles/42?ref=home');
    const after = Date.now();

    expect(response.status).toBe(302);

    await getClickQueue(app).flush();

    const rows = await listClicks(link.id);

    expect(rows).toHaveLength(1);

    const row = rows[0];

    if (!row) {
      throw new Error('Expected a persisted click');
    }

    expect(row).toMatchObject({
      linkId: link.id,
      deviceType: 'mobile',
      browser: 'Mobile Safari',
      os: 'iOS',
      referrerHost: 'news.example.org',
      referrerUrl: 'https://news.example.org/articles/42?ref=home',
    });
    expect(row.clickedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(row.clickedAt.getTime()).toBeLessThanOrEqual(after);
    expect(row.visitorHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(row)).not.toContain('127.0.0.1');
  });
});

describe('(9) redirect cache invalidation', () => {
  it('reflects edits, disable/enable, and delete immediately', async () => {
    const { cookie } = await createUserWithCookie();

    const created = await request(app)
      .post('/api/links')
      .set('Cookie', cookie)
      .send({ destinationUrl: 'https://old.example.com', alias: 'cache1' });
    const link = (created.body as LinkResponse).link;

    expect(created.status).toBe(201);

    const warm = await request(app).get('/cache1');
    expect(warm.status).toBe(302);
    expect(warm.headers['location']).toBe('https://old.example.com');
    expect(getCachedLink('cache1')).toBeDefined();

    const edited = await request(app)
      .patch(`/api/links/${link.id}`)
      .set('Cookie', cookie)
      .send({ destinationUrl: 'https://new.example.com' });

    expect(edited.status).toBe(200);
    expect(getCachedLink('cache1')).toBeUndefined();

    const afterEdit = await request(app).get('/cache1');
    expect(afterEdit.status).toBe(302);
    expect(afterEdit.headers['location']).toBe('https://new.example.com');

    const disabled = await request(app)
      .patch(`/api/links/${link.id}`)
      .set('Cookie', cookie)
      .send({ isActive: false });

    expect(disabled.status).toBe(200);
    expect(getCachedLink('cache1')).toBeUndefined();

    const afterDisable = await request(app).get('/cache1');
    expect(afterDisable.status).toBe(410);
    expect(afterDisable.text).toContain('disabled');

    const enabled = await request(app)
      .patch(`/api/links/${link.id}`)
      .set('Cookie', cookie)
      .send({ isActive: true });

    expect(enabled.status).toBe(200);

    const afterEnable = await request(app).get('/cache1');
    expect(afterEnable.status).toBe(302);
    expect(afterEnable.headers['location']).toBe('https://new.example.com');

    await insertTestClick(link.id);

    const removed = await request(app).delete(`/api/links/${link.id}`).set('Cookie', cookie);

    expect(removed.status).toBe(204);
    expect(getCachedLink('cache1')).toBeUndefined();

    const afterDelete = await request(app).get('/cache1');
    expect(afterDelete.status).toBe(404);

    // Deleting a link cascades to its clicks.
    expect(await countClicks(link.id)).toBe(0);
  });
});

describe('(10) analytics aggregation', () => {
  it('aggregates totals, unique visitors, gap-filled days, referrers, and splits', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-03-10T12:00:00.000Z'));

    try {
      const user = await createTestUser();
      const link = await createTestLink({ userId: user.id, alias: 'stats1' });
      const otherLink = await createTestLink({ userId: user.id, alias: 'stats2' });

      const visitorOne = 'a'.repeat(64);
      const visitorTwo = 'b'.repeat(64);

      await insertTestClick(link.id, {
        clickedAt: new Date('2026-03-04T10:00:00.000Z'),
        visitorHash: visitorOne,
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        referrerHost: 'news.example.org',
        referrerUrl: 'https://news.example.org/story',
      });
      await insertTestClick(link.id, {
        clickedAt: new Date('2026-03-07T09:00:00.000Z'),
        visitorHash: visitorOne,
        deviceType: 'mobile',
        browser: 'Safari',
        os: 'iOS',
      });
      await insertTestClick(link.id, {
        clickedAt: new Date('2026-03-07T10:00:00.000Z'),
        visitorHash: visitorTwo,
        deviceType: 'desktop',
        browser: 'Chrome',
        os: 'Windows',
        referrerHost: 'news.example.org',
        referrerUrl: 'https://news.example.org/other',
      });
      await insertTestClick(link.id, {
        clickedAt: new Date('2026-03-10T00:00:00.000Z'),
        visitorHash: visitorTwo,
        deviceType: 'tablet',
        browser: 'Firefox',
        os: 'Android',
      });
      // Outside the 7-day window and belonging to another link: both excluded.
      await insertTestClick(link.id, {
        clickedAt: new Date('2026-03-03T23:59:00.000Z'),
        visitorHash: 'c'.repeat(64),
      });
      await insertTestClick(otherLink.id, {
        clickedAt: new Date('2026-03-07T12:00:00.000Z'),
        visitorHash: 'd'.repeat(64),
      });

      const response = await request(app)
        .get(`/api/links/${link.id}/analytics?range=7d`)
        .set('Cookie', authCookieFor(user.id));
      const body = response.body as AnalyticsBody;

      expect(response.status).toBe(200);
      expect(body.linkId).toBe(link.id);
      expect(body.range).toBe('7d');
      expect(body.from).toBe('2026-03-04T00:00:00.000Z');
      expect(body.to).toBe('2026-03-11T00:00:00.000Z');

      expect(body.totals).toEqual({ totalClicks: 4, uniqueVisitors: 2 });
      expect(body.clicksOverTime).toEqual([
        { date: '2026-03-04', clicks: 1 },
        { date: '2026-03-05', clicks: 0 },
        { date: '2026-03-06', clicks: 0 },
        { date: '2026-03-07', clicks: 2 },
        { date: '2026-03-08', clicks: 0 },
        { date: '2026-03-09', clicks: 0 },
        { date: '2026-03-10', clicks: 1 },
      ]);

      expect(body.topReferrers).toHaveLength(2);
      expect(body.topReferrers).toEqual(
        expect.arrayContaining([
          { referrer: 'news.example.org', clicks: 2 },
          { referrer: 'Direct', clicks: 2 },
        ]),
      );
      expect(body.deviceSplit).toEqual(
        expect.arrayContaining([
          { deviceType: 'desktop', clicks: 2 },
          { deviceType: 'mobile', clicks: 1 },
          { deviceType: 'tablet', clicks: 1 },
        ]),
      );
      expect(body.browserSplit).toEqual(
        expect.arrayContaining([
          { browser: 'Chrome', clicks: 2 },
          { browser: 'Safari', clicks: 1 },
          { browser: 'Firefox', clicks: 1 },
        ]),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('uses a half-open window [from, to) and fills empty days', async () => {
    const user = await createTestUser();
    const link = await createTestLink({ userId: user.id, alias: 'window1' });
    const from = new Date('2026-03-04T00:00:00.000Z');
    const to = new Date('2026-03-11T00:00:00.000Z');

    await insertTestClick(link.id, {
      clickedAt: from,
      visitorHash: 'a'.repeat(64),
    });
    await insertTestClick(link.id, {
      clickedAt: new Date('2026-03-07T12:00:00.000Z'),
      visitorHash: 'b'.repeat(64),
    });
    await insertTestClick(link.id, {
      clickedAt: to,
      visitorHash: 'c'.repeat(64),
    });

    const totals = await getAnalyticsTotals({ linkId: link.id, from, to });
    const daily = await getClicksOverTime({ linkId: link.id, from, to });

    expect(totals).toEqual({ totalClicks: 2, uniqueVisitors: 2 });
    expect(daily).toEqual([
      { date: '2026-03-04', clicks: 1 },
      { date: '2026-03-05', clicks: 0 },
      { date: '2026-03-06', clicks: 0 },
      { date: '2026-03-07', clicks: 1 },
      { date: '2026-03-08', clicks: 0 },
      { date: '2026-03-09', clicks: 0 },
      { date: '2026-03-10', clicks: 0 },
    ]);
  });
});
