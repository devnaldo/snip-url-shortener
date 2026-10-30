import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { CLIENT_DIST_DIR } from '../src/lib/client-assets.js';

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

const CLIENT_SOURCE_DIR = fileURLToPath(new URL('../../client', import.meta.url));
const SOURCE_INDEX = path.join(CLIENT_SOURCE_DIR, 'index.html');
const PUBLIC_THEME_INIT = path.join(CLIENT_SOURCE_DIR, 'public', 'theme-init.js');
const BUILT_INDEX = path.join(CLIENT_DIST_DIR, 'index.html');
const BUILT_THEME_INIT = path.join(CLIENT_DIST_DIR, 'theme-init.js');

let app: Express;
let createdDistDir = false;
let createdIndexFile = false;
let createdThemeFile = false;

/**
 * Prefer the real Vite build. On a clean checkout there is no `client/dist`,
 * so mirror what Vite copies from the template and `public/` into `dist/`.
 */
function prepareClientBuild(): void {
  if (!existsSync(BUILT_INDEX)) {
    if (!existsSync(CLIENT_DIST_DIR)) {
      mkdirSync(CLIENT_DIST_DIR, { recursive: true });
      createdDistDir = true;
    }

    writeFileSync(BUILT_INDEX, readFileSync(SOURCE_INDEX));
    createdIndexFile = true;
  }

  if (!existsSync(BUILT_THEME_INIT)) {
    writeFileSync(BUILT_THEME_INIT, readFileSync(PUBLIC_THEME_INIT));
    createdThemeFile = true;
  }
}

function removeClientBuildFixture(): void {
  if (createdThemeFile) {
    rmSync(BUILT_THEME_INIT, { force: true });
  }

  if (createdIndexFile) {
    rmSync(BUILT_INDEX, { force: true });
  }

  if (createdDistDir) {
    rmSync(CLIENT_DIST_DIR, { recursive: true, force: true });
  }
}

beforeAll(() => {
  prepareClientBuild();
  app = createApp();
});

afterAll(() => {
  removeClientBuildFixture();
});

describe('theme bootstrap', () => {
  it('ships a blocking external script with no inline script in the built HTML', () => {
    const html = readFileSync(BUILT_INDEX, 'utf8');
    const scriptTags = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? [];

    expect(scriptTags.length).toBeGreaterThan(0);

    for (const tag of scriptTags) {
      expect(tag).toMatch(/^<script\b[^>]*\bsrc=/i);
    }

    const themeTag = scriptTags.find((tag) => tag.includes('/theme-init.js'));
    expect(themeTag).toBe('<script src="/theme-init.js"></script>');
    expect(themeTag).not.toMatch(/\b(defer|async)\b/i);

    const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'));
    expect(head).toContain('<script src="/theme-init.js"></script>');
  });

  it('serves the external theme script from the client root', async () => {
    const response = await request(app).get('/theme-init.js');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/javascript/);
    expect(response.text).toBe(readFileSync(PUBLIC_THEME_INIT, 'utf8'));
  });
});
