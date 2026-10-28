import { describe, expect, it } from 'vitest';
import {
  buildClickMetadata,
  computeVisitorHash,
  parseReferrer,
  parseUserAgent,
} from '../src/lib/click-metadata.js';

const CHROME_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

describe('parseUserAgent', () => {
  it('classifies desktop browsers', () => {
    expect(parseUserAgent(CHROME_UA)).toEqual({
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
    });
  });

  it('classifies mobile and tablet devices', () => {
    expect(parseUserAgent(IPHONE_UA)).toMatchObject({
      deviceType: 'mobile',
      browser: 'Mobile Safari',
      os: 'iOS',
    });
    expect(parseUserAgent(IPAD_UA)).toMatchObject({ deviceType: 'tablet', os: 'iOS' });
  });

  it('classifies bots', () => {
    expect(parseUserAgent(GOOGLEBOT_UA).deviceType).toBe('bot');
  });

  it('falls back to unknown for empty agents', () => {
    expect(parseUserAgent('')).toEqual({
      deviceType: 'unknown',
      browser: 'Unknown',
      os: 'Unknown',
    });
  });
});

describe('parseReferrer', () => {
  it('extracts the host and URL of an http referrer', () => {
    expect(parseReferrer('https://news.example.org/articles/42?ref=home')).toEqual({
      referrerHost: 'news.example.org',
      referrerUrl: 'https://news.example.org/articles/42?ref=home',
    });
  });

  it('strips credentials from the referrer URL', () => {
    expect(parseReferrer('https://user:secret@example.org/page')).toEqual({
      referrerHost: 'example.org',
      referrerUrl: 'https://example.org/page',
    });
  });

  it.each([
    ['missing', undefined],
    ['non-http scheme', 'javascript:alert(1)'],
    ['relative URL', '/some/page'],
    ['overly long', `https://example.org/${'a'.repeat(2_100)}`],
  ])('ignores an invalid referrer (%s)', (_label, referrer) => {
    expect(parseReferrer(referrer)).toEqual({ referrerHost: null, referrerUrl: null });
  });
});

describe('computeVisitorHash', () => {
  const day = new Date('2026-03-01T12:00:00.000Z');

  it('produces a stable 64-character hash for the same day', () => {
    const first = computeVisitorHash('203.0.113.9', CHROME_UA, day);
    const second = computeVisitorHash('203.0.113.9', CHROME_UA, new Date('2026-03-01T23:59:00Z'));

    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(second).toBe(first);
    expect(first).not.toContain('203.0.113.9');
  });

  it('rotates the salt at UTC midnight', () => {
    const before = computeVisitorHash('203.0.113.9', CHROME_UA, new Date('2026-03-01T23:59:59Z'));
    const after = computeVisitorHash('203.0.113.9', CHROME_UA, new Date('2026-03-02T00:00:00Z'));

    expect(after).not.toBe(before);
  });

  it('changes when the IP or user agent changes', () => {
    const baseline = computeVisitorHash('203.0.113.9', CHROME_UA, day);

    expect(computeVisitorHash('203.0.113.10', CHROME_UA, day)).not.toBe(baseline);
    expect(computeVisitorHash('203.0.113.9', IPHONE_UA, day)).not.toBe(baseline);
  });
});

describe('buildClickMetadata', () => {
  it('combines device, referrer, and visitor fields without the raw IP', () => {
    const metadata = buildClickMetadata({
      ip: '198.51.100.7',
      userAgent: CHROME_UA,
      referrer: 'https://news.example.org/story',
      now: new Date('2026-03-01T12:00:00.000Z'),
    });

    expect(metadata).toMatchObject({
      deviceType: 'desktop',
      browser: 'Chrome',
      os: 'Windows',
      referrerHost: 'news.example.org',
      referrerUrl: 'https://news.example.org/story',
    });
    expect(metadata.visitorHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(metadata)).not.toContain('198.51.100.7');
  });
});
