import type { Express } from 'express';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp, getClickQueue } from '../src/app.js';
import type { Link } from '../src/db/schema.js';
import type { ClickMetadata, ClickMetadataInput } from '../src/lib/click-metadata.js';
import { logger } from '../src/lib/logger.js';
import { clearRedirectCache } from '../src/lib/redirect-cache.js';
import { insertClicks } from '../src/repositories/clicks.repository.js';
import { findLinkByAlias } from '../src/repositories/links.repository.js';

const metadataFailure = vi.hoisted(() => ({
  shouldThrow: false,
  error: new Error('Malformed click metadata'),
}));

interface ClickMetadataModule {
  buildClickMetadata: (input: ClickMetadataInput) => ClickMetadata;
}

vi.mock('../src/repositories/links.repository.js', () => ({
  insertLink: vi.fn(),
  findLinksByUser: vi.fn(),
  countLinksByUser: vi.fn(),
  findLinkByAlias: vi.fn(),
  findLinkForUser: vi.fn(),
  updateLinkForUser: vi.fn(),
  deleteLinkForUser: vi.fn(),
}));

vi.mock('../src/repositories/clicks.repository.js', () => ({
  insertClicks: vi.fn(),
}));

// Keep the real parser for normal tests, but allow a test to simulate a
// malformed header that makes metadata extraction throw.
vi.mock('../src/lib/click-metadata.js', async (importOriginal) => {
  const actual = await importOriginal<ClickMetadataModule>();

  return {
    ...actual,
    buildClickMetadata: (input: ClickMetadataInput) => {
      if (metadataFailure.shouldThrow) {
        throw metadataFailure.error;
      }

      return actual.buildClickMetadata(input);
    },
  };
});

const findLinkByAliasMock = vi.mocked(findLinkByAlias);
const insertClicksMock = vi.mocked(insertClicks);

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LINK_ID = '22222222-2222-4222-8222-222222222222';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

let app: Express;

beforeEach(() => {
  metadataFailure.shouldThrow = false;
  vi.resetAllMocks();
  clearRedirectCache();
  app = createApp();
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeLink(overrides: Partial<Link> = {}): Link {
  return {
    id: LINK_ID,
    userId: USER_ID,
    alias: 'abc1234',
    destinationUrl: 'https://example.com/landing',
    isActive: true,
    expiresAt: null,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    ...overrides,
  };
}

async function drainClicks(): Promise<void> {
  await getClickQueue(app).flush();
}

describe('GET /:alias', () => {
  it('redirects an active link with a 302 and no-store caching', async () => {
    findLinkByAliasMock.mockResolvedValue(makeLink());

    const response = await request(app).get('/abc1234');

    expect(response.status).toBe(302);
    expect(response.headers['location']).toBe('https://example.com/landing');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(findLinkByAliasMock).toHaveBeenCalledWith('abc1234');
  });

  it('records one click with parsed UA, referrer, and a visitor hash', async () => {
    findLinkByAliasMock.mockResolvedValue(makeLink());

    await request(app)
      .get('/abc1234')
      .set('User-Agent', CHROME_UA)
      .set('Referer', 'https://news.example.org/articles/42?ref=home');

    await drainClicks();

    expect(insertClicksMock).toHaveBeenCalledTimes(1);
    const events = insertClicksMock.mock.calls[0]?.[0] ?? [];

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      linkId: LINK_ID,
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      referrerHost: 'news.example.org',
      referrerUrl: 'https://news.example.org/articles/42?ref=home',
    });
    expect(events[0]?.clickedAt).toBeInstanceOf(Date);
    expect(events[0]?.visitorHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(events)).not.toContain('127.0.0.1');
  });

  it('detects mobile, tablet, and bot devices', async () => {
    findLinkByAliasMock.mockResolvedValue(makeLink());

    await request(app).get('/abc1234').set('User-Agent', IPHONE_UA);
    await request(app).get('/abc1234').set('User-Agent', IPAD_UA);
    await request(app)
      .get('/abc1234')
      .set(
        'User-Agent',
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      );

    await drainClicks();

    const events = insertClicksMock.mock.calls.flatMap((call) => call[0]);
    expect(events.map((event) => event.deviceType)).toEqual(['mobile', 'tablet', 'bot']);
    expect(events[1]).toMatchObject({ browser: 'Mobile Safari', os: 'iOS' });
  });

  it('serves repeat redirects from the cache without another database lookup', async () => {
    findLinkByAliasMock.mockResolvedValue(makeLink());

    await request(app).get('/abc1234');
    await request(app).get('/abc1234');

    expect(findLinkByAliasMock).toHaveBeenCalledTimes(1);

    await drainClicks();

    expect(insertClicksMock.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it('enforces an expiry that passes while the link is cached', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    findLinkByAliasMock.mockResolvedValue(
      makeLink({ expiresAt: new Date('2026-01-01T00:00:30.000Z') }),
    );

    try {
      const first = await request(app).get('/abc1234');
      expect(first.status).toBe(302);

      vi.setSystemTime(new Date('2026-01-01T00:01:00.000Z'));

      const second = await request(app).get('/abc1234');
      expect(second.status).toBe(410);
      expect(second.text).toContain('expired');
      expect(findLinkByAliasMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }

    await drainClicks();
    expect(insertClicksMock.mock.calls.flatMap((call) => call[0])).toHaveLength(1);
  });

  it('returns an escaped 410 page for a disabled link', async () => {
    findLinkByAliasMock.mockResolvedValue(makeLink({ isActive: false }));

    const response = await request(app).get('/abc1234');

    expect(response.status).toBe(410);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.text).toContain('disabled');
    expect(response.text).not.toContain('expired');

    await drainClicks();
    expect(insertClicksMock).not.toHaveBeenCalled();
  });

  it('returns a distinct 410 page for an expired link', async () => {
    findLinkByAliasMock.mockResolvedValue(
      makeLink({ expiresAt: new Date('2020-01-01T00:00:00Z') }),
    );

    const response = await request(app).get('/abc1234');

    expect(response.status).toBe(410);
    expect(response.text).toContain('expired');
    expect(response.text).not.toContain('disabled');

    await drainClicks();
    expect(insertClicksMock).not.toHaveBeenCalled();
  });

  it('returns a 404 HTML page for an unknown alias and records no click', async () => {
    findLinkByAliasMock.mockResolvedValue(undefined);

    const response = await request(app).get('/missing1');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('missing1');

    await drainClicks();
    expect(insertClicksMock).not.toHaveBeenCalled();
  });

  it.each([
    ['too short', '/ab'],
    ['invalid characters', '/bad%20alias'],
    ['too long', `/${'a'.repeat(33)}`],
  ])('answers a malformed alias (%s) without a query', async (_label, path) => {
    const response = await request(app).get(path);

    expect(response.status).toBe(404);
    expect(findLinkByAliasMock).not.toHaveBeenCalled();
  });

  it('still redirects when click persistence fails', async () => {
    findLinkByAliasMock.mockResolvedValue(makeLink());
    insertClicksMock.mockRejectedValue(new Error('database is down'));

    const response = await request(app).get('/abc1234').set('User-Agent', CHROME_UA);

    expect(response.status).toBe(302);
    expect(response.headers['location']).toBe('https://example.com/landing');
    await expect(drainClicks()).resolves.toBeUndefined();
    expect(insertClicksMock).toHaveBeenCalledTimes(1);
  });

  it('returns 302 and logs when the click queue enqueue throws synchronously', async () => {
    findLinkByAliasMock.mockResolvedValue(makeLink());

    const queue = getClickQueue(app);
    const enqueueError = new Error('queue is closed');
    const enqueue = vi.spyOn(queue, 'enqueue').mockImplementation(() => {
      throw enqueueError;
    });
    const errorSpy = vi.spyOn(logger, 'error');

    const response = await request(app).get('/abc1234').set('User-Agent', CHROME_UA);

    expect(response.status).toBe(302);
    expect(response.headers['location']).toBe('https://example.com/landing');
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith({ err: enqueueError }, 'Failed to enqueue click event');

    await drainClicks();
    expect(queue.size).toBe(0);
    expect(insertClicksMock).not.toHaveBeenCalled();
  });

  it('returns 302 and logs when click metadata parsing throws', async () => {
    findLinkByAliasMock.mockResolvedValue(makeLink());
    const errorSpy = vi.spyOn(logger, 'error');
    metadataFailure.shouldThrow = true;

    const response = await request(app)
      .get('/abc1234')
      .set('User-Agent', 'Mozilla/5.0 (malformed user agent')
      .set('Referer', 'not a valid referrer');

    expect(response.status).toBe(302);
    expect(response.headers['location']).toBe('https://example.com/landing');
    expect(errorSpy).toHaveBeenCalledWith(
      { err: metadataFailure.error },
      'Failed to enqueue click event',
    );

    await drainClicks();
    expect(getClickQueue(app).size).toBe(0);
    expect(insertClicksMock).not.toHaveBeenCalled();
  });

  it('lets API routes win over the alias route', async () => {
    const response = await request(app).get('/api/unknown');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(findLinkByAliasMock).not.toHaveBeenCalled();
  });
});
