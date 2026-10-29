import { describe, expect, it } from 'vitest';
import { envSchema } from '../src/config/env.js';

const JWT_PLACEHOLDER = 'change-me-jwt-secret-at-least-32-characters';
const CLICK_HASH_PLACEHOLDER = 'change-me-click-hash-secret-at-least-32-chars';

const BASE_ENV = {
  NODE_ENV: 'development',
  PORT: '3000',
  DATABASE_URL: 'postgresql://snip:snip@localhost:5432/snip',
  JWT_SECRET: 'a'.repeat(32),
  CLIENT_URL: 'http://localhost:5173',
  BASE_URL: 'http://localhost:3000',
  CLICK_HASH_SECRET: 'b'.repeat(32),
  TRUST_PROXY: '0',
  LINK_RATE_LIMIT_MAX: '20',
  LINK_RATE_LIMIT_WINDOW_MS: '3600000',
};

const PRODUCTION_ENV = {
  ...BASE_ENV,
  NODE_ENV: 'production',
  BASE_URL: 'https://snip.example.com',
  CLIENT_URL: 'https://snip.example.com',
};

function parse(overrides: Record<string, string> = {}) {
  return envSchema.safeParse({ ...BASE_ENV, ...overrides });
}

function issuePaths(result: ReturnType<typeof parse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join('.'));
}

describe('production environment validation', () => {
  it('accepts https URLs and non-placeholder secrets', () => {
    const result = envSchema.safeParse(PRODUCTION_ENV);

    expect(result.success).toBe(true);
  });

  it.each(['BASE_URL', 'CLIENT_URL'])('rejects a non-https %s', (key) => {
    const result = envSchema.safeParse({ ...PRODUCTION_ENV, [key]: 'http://snip.example.com' });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain(key);
  });

  it.each(['BASE_URL', 'CLIENT_URL'])('rejects a trailing slash on %s', (key) => {
    const result = envSchema.safeParse({ ...PRODUCTION_ENV, [key]: 'https://snip.example.com/' });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain(key);
  });

  it.each([
    ['JWT_SECRET', JWT_PLACEHOLDER],
    ['CLICK_HASH_SECRET', CLICK_HASH_PLACEHOLDER],
  ])('rejects the .env.example placeholder for %s', (key, value) => {
    const result = envSchema.safeParse({ ...PRODUCTION_ENV, [key]: value });

    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain(key);
  });

  it.each(['development', 'test'])('keeps %s behaviour unchanged', (nodeEnv) => {
    const result = parse({
      NODE_ENV: nodeEnv,
      BASE_URL: 'http://localhost:3000',
      CLIENT_URL: 'http://localhost:5173',
      JWT_SECRET: JWT_PLACEHOLDER,
      CLICK_HASH_SECRET: CLICK_HASH_PLACEHOLDER,
    });

    expect(result.success).toBe(true);
  });

  it('accepts a TLS connection string for managed PostgreSQL', () => {
    const result = parse({
      DATABASE_URL: 'postgresql://snip:secret@db.example.com:5432/snip?sslmode=require',
    });

    expect(result.success).toBe(true);
  });
});
