import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { CLIENT_DIST_DIR } from '../src/lib/client-assets.js';
import { clearRedirectCache } from '../src/lib/redirect-cache.js';
import type { Link } from '../src/db/schema.js';
import { findLinkByAlias } from '../src/repositories/links.repository.js';

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

const findLinkByAliasMock = vi.mocked(findLinkByAlias);

const INDEX_FILE = path.join(CLIENT_DIST_DIR, 'index.html');
const ASSETS_DIR = path.join(CLIENT_DIST_DIR, 'assets');
const FAKE_INDEX_HTML =
  '<!doctype html><html><body><div id="root"></div><script type="module" src="/assets/static-test-asset.js"></script></body></html>';

const USER_ID = '11111111-1111-4111-8111-111111111111';
const LINK_ID = '22222222-2222-4222-8222-222222222222';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

let app: Express;
let assetFile = '';
let createdDistDir = false;
let createdAssetsDir = false;
let createdIndexFile = false;
let createdAssetFile = false;

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

function firstJavaScriptAsset(): string | undefined {
  if (!existsSync(ASSETS_DIR)) {
    return undefined;
  }

  return readdirSync(ASSETS_DIR).find((file) => file.endsWith('.js'));
}

function prepareClientBuild(): void {
  const hasRealBuild = existsSync(INDEX_FILE);

  if (!hasRealBuild) {
    if (!existsSync(CLIENT_DIST_DIR)) {
      mkdirSync(CLIENT_DIST_DIR, { recursive: true });
      createdDistDir = true;
    }

    writeFileSync(INDEX_FILE, FAKE_INDEX_HTML);
    createdIndexFile = true;
  }

  assetFile = firstJavaScriptAsset() ?? 'static-test-asset.js';

  if (!existsSync(ASSETS_DIR)) {
    mkdirSync(ASSETS_DIR, { recursive: true });
    createdAssetsDir = true;
  }

  const assetPath = path.join(ASSETS_DIR, assetFile);

  if (!existsSync(assetPath)) {
    writeFileSync(assetPath, 'console.log("static test asset");\n');
    createdAssetFile = true;
  }
}

function removeFakeClientBuild(): void {
  if (createdAssetFile) {
    rmSync(path.join(ASSETS_DIR, assetFile), { force: true });
  }

  if (createdAssetsDir) {
    rmSync(ASSETS_DIR, { recursive: true, force: true });
  }

  if (createdIndexFile) {
    rmSync(INDEX_FILE, { force: true });
  }

  if (createdDistDir) {
    rmSync(CLIENT_DIST_DIR, { recursive: true, force: true });
  }
}

beforeAll(() => {
  // Tests must work from a clean checkout where the real Vite build is absent.
  prepareClientBuild();
  app = createApp();
});

afterAll(() => {
  removeFakeClientBuild();
});

beforeEach(() => {
  clearRedirectCache();
  findLinkByAliasMock.mockReset();
  findLinkByAliasMock.mockResolvedValue(undefined);
});

describe('built client delivery', () => {
  it.each(['/login', '/register'])('serves index.html for GET %s', async (route) => {
    const response = await request(app).get(route);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.headers['cache-control']).toBe('no-cache');
    expect(response.text).toContain('id="root"');
    expect(findLinkByAliasMock).not.toHaveBeenCalled();
  });

  it('serves index.html for a client analytics route', async () => {
    const response = await request(app).get(`/links/${LINK_ID}/analytics`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('id="root"');
    expect(findLinkByAliasMock).not.toHaveBeenCalled();
  });

  it('serves hashed assets with a long-lived cache and the right content type', async () => {
    const response = await request(app).get(`/assets/${assetFile}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
    expect(response.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('keeps the 404 notice page for unknown aliases', async () => {
    findLinkByAliasMock.mockResolvedValue(undefined);

    const response = await request(app).get('/unknown-alias');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/text\/html/);
    expect(response.text).toContain('unknown-alias');
    expect(findLinkByAliasMock).toHaveBeenCalledWith('unknown-alias');
  });

  it('keeps JSON 404 responses for unknown API routes', async () => {
    const response = await request(app).get('/api/unknown');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/application\/json/);
    expect(response.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Resource not found' },
    });
    expect(findLinkByAliasMock).not.toHaveBeenCalled();
  });

  it('still redirects existing aliases with a 302', async () => {
    findLinkByAliasMock.mockResolvedValue(makeLink());

    const response = await request(app).get('/abc1234');

    expect(response.status).toBe(302);
    expect(response.headers['location']).toBe('https://example.com/landing');
    expect(findLinkByAliasMock).toHaveBeenCalledWith('abc1234');
  });

  it('allows blob images in the CSP while keeping the other defaults', async () => {
    const response = await request(app).get('/login');
    const policy = response.headers['content-security-policy'] ?? '';

    expect(policy).toContain("img-src 'self' data: blob:");
    expect(policy).toContain("default-src 'self'");
    expect(policy).toContain("script-src 'self'");
    expect(policy).toContain("object-src 'none'");
  });
});
