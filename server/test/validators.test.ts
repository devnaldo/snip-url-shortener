import { describe, expect, it } from 'vitest';
import {
  GENERATED_ALIAS_LENGTH,
  RESERVED_ALIASES,
  generateAlias,
  validateAlias,
} from '../src/lib/alias.js';
import { MAX_DESTINATION_URL_LENGTH, validateDestinationUrl } from '../src/lib/destination-url.js';

const BASE_URL = 'https://snip.test';

describe('validateDestinationUrl', () => {
  it.each([
    'https://example.com',
    'http://example.com/path?query=1#fragment',
    'https://sub.example.com:8443/path',
    'HTTPS://EXAMPLE.COM',
    'http://8.8.8.8',
    'http://172.32.0.1',
    'https://[2606:4700:4700::1111]/dns-query',
    'https://localhost.example.com',
  ])('accepts %s', (url) => {
    expect(validateDestinationUrl(url, BASE_URL)).toEqual({ valid: true });
  });

  it.each([
    ['empty', ''],
    ['relative', '/path'],
    ['scheme-relative', '//example.com'],
    ['missing scheme', 'example.com'],
    ['javascript', 'javascript:alert(1)'],
    ['data', 'data:text/plain,hello'],
    ['file', 'file:///etc/passwd'],
    ['ftp', 'ftp://example.com/file'],
    ['credentials', 'https://user:pass@example.com'],
    ['username only', 'https://user@example.com'],
    ['own host', 'https://snip.test/any-path'],
    ['own host with port', 'https://snip.test:8443/'],
    ['localhost', 'http://localhost:3000'],
    ['localhost subdomain', 'http://app.localhost'],
    ['loopback IPv4', 'http://127.0.0.1'],
    ['short loopback IPv4', 'http://127.1'],
    ['loopback IPv6', 'http://[::1]'],
    ['mapped loopback IPv6', 'http://[::ffff:127.0.0.1]'],
    ['private 10/8', 'http://10.1.2.3'],
    ['private 172.16/12', 'http://172.16.0.1'],
    ['private 192.168/16', 'http://192.168.1.1'],
    ['link-local', 'http://169.254.169.254'],
    ['carrier-grade NAT', 'http://100.64.0.1'],
    ['unspecified', 'http://0.0.0.0'],
    ['unique-local IPv6', 'http://[fd00::1]'],
    ['link-local IPv6', 'http://[fe80::1]'],
    ['multicast', 'http://224.0.0.1'],
  ])('rejects %s', (_label, url) => {
    const result = validateDestinationUrl(url, BASE_URL);

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.message.length).toBeGreaterThan(0);
    }
  });

  it('rejects destinations longer than the limit', () => {
    const url = `https://example.com/${'a'.repeat(MAX_DESTINATION_URL_LENGTH)}`;

    expect(validateDestinationUrl(url, BASE_URL).valid).toBe(false);
  });

  it('accepts a URL exactly at the limit', () => {
    const prefix = 'https://example.com/';
    const url = `${prefix}${'a'.repeat(MAX_DESTINATION_URL_LENGTH - prefix.length)}`;

    expect(url).toHaveLength(MAX_DESTINATION_URL_LENGTH);
    expect(validateDestinationUrl(url, BASE_URL)).toEqual({ valid: true });
  });
});

describe('validateAlias', () => {
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
    ['reserved with uppercase', 'API'],
    ['reserved mixed case', 'Admin'],
    ['reserved with dot', 'favicon.ico'],
  ])('rejects %s', (_label, alias) => {
    const result = validateAlias(alias);

    expect(result.valid).toBe(false);

    if (!result.valid) {
      expect(result.message.length).toBeGreaterThan(0);
    }
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
});

describe('generateAlias', () => {
  it('creates 7-character aliases that satisfy alias validation', () => {
    for (let i = 0; i < 20; i += 1) {
      const alias = generateAlias();

      expect(alias).toHaveLength(GENERATED_ALIAS_LENGTH);
      expect(validateAlias(alias)).toEqual({ valid: true });
    }
  });

  it('produces distinct values', () => {
    const aliases = new Set(Array.from({ length: 100 }, () => generateAlias()));

    expect(aliases.size).toBeGreaterThan(95);
  });
});
