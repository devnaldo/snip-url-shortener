import { BlockList, isIP } from 'node:net';
import { z } from 'zod';
import './load-env.js';

const isPostgresUrl = (value: string): boolean => {
  try {
    const { protocol } = new URL(value);
    return protocol === 'postgres:' || protocol === 'postgresql:';
  } catch {
    return false;
  }
};

const REQUIRED_TLS_SSLMODES: ReadonlySet<string> = new Set(['require', 'verify-ca', 'verify-full']);

const hasProductionTls = (value: string): boolean => {
  try {
    const sslmode = new URL(value).searchParams.get('sslmode');
    return sslmode !== null && REQUIRED_TLS_SSLMODES.has(sslmode);
  } catch {
    return false;
  }
};

// Must match the production placeholders shipped in .env.example. They are
// fine for local development but must never reach a production deployment.
const PLACEHOLDER_SECRETS: ReadonlySet<string> = new Set([
  'change-me-jwt-secret-at-least-32-characters',
  'change-me-click-hash-secret-at-least-32-chars',
]);

const loopbackAddresses = new BlockList();
loopbackAddresses.addSubnet('127.0.0.0', 8, 'ipv4');
loopbackAddresses.addAddress('::1', 'ipv6');

function isLoopbackHost(hostname: string): boolean {
  const host = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.+$/, '');

  if (host === 'localhost' || host.endsWith('.localhost')) {
    return true;
  }

  const version = isIP(host);

  if (version === 4) {
    return loopbackAddresses.check(host, 'ipv4');
  }

  if (version === 6) {
    return loopbackAddresses.check(host, 'ipv6');
  }

  return false;
}

const isProductionOrigin = (value: string): boolean => {
  if (value.endsWith('/')) {
    return false;
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return (
    url.protocol === 'https:' &&
    url.origin === value &&
    url.username === '' &&
    url.password === '' &&
    url.pathname === '/' &&
    url.search === '' &&
    url.hash === '' &&
    !isLoopbackHost(url.hostname)
  );
};

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z.string().refine(isPostgresUrl, 'Must be a postgres:// connection string'),
    JWT_SECRET: z.string().min(32, 'Must be at least 32 characters long'),
    CLIENT_URL: z.url(),
    BASE_URL: z.url(),
    CLICK_HASH_SECRET: z.string().min(32, 'Must be at least 32 characters long'),
    TRUST_PROXY: z.coerce.number().int().min(0).max(10).default(0),
    LINK_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
    LINK_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(3_600_000),
  })
  .superRefine((value, context) => {
    if (value.NODE_ENV !== 'production') {
      return;
    }

    if (!hasProductionTls(value.DATABASE_URL)) {
      context.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message:
          'Must include sslmode=require, sslmode=verify-ca, or sslmode=verify-full in production',
      });
    }

    for (const key of ['BASE_URL', 'CLIENT_URL'] as const) {
      if (!isProductionOrigin(value[key])) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message:
            'Must be an https origin without credentials, path, query, hash, localhost, or a loopback address in production',
        });
      }
    }

    for (const key of ['JWT_SECRET', 'CLICK_HASH_SECRET'] as const) {
      if (PLACEHOLDER_SECRETS.has(value[key])) {
        context.addIssue({
          code: 'custom',
          path: [key],
          message: 'Must not use the placeholder value from .env.example in production',
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

function parseEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid environment configuration:\n${details}\n\nSee .env.example for the expected variables.`,
    );
  }

  return result.data;
}

export const env = parseEnv();
