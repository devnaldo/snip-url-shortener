import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { Link } from '../src/db/schema.js';
import { AUTH_COOKIE_NAME } from '../src/lib/auth-cookie.js';
import { signAuthToken } from '../src/lib/auth-token.js';
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

const findLinkForUserMock = vi.mocked(findLinkForUser);

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '33333333-3333-4333-8333-333333333333';
const LINK_ID = '22222222-2222-4222-8222-222222222222';

interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
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

describe('GET /api/links/:id/qr', () => {
  it('requires authentication', async () => {
    const response = await request(app).get(`/api/links/${LINK_ID}/qr`);

    expect(response.status).toBe(401);
    expect(findLinkForUserMock).not.toHaveBeenCalled();
  });

  it('returns an SVG QR code for an owned link', async () => {
    findLinkForUserMock.mockResolvedValue(makeLink());

    const response = await request(app).get(`/api/links/${LINK_ID}/qr`).set('Cookie', authCookie());

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/image\/svg\+xml/);
    expect(response.headers['content-disposition']).toBe('inline; filename="snip-abc1234.svg"');
    expect(response.headers['cache-control']).toBe('private, max-age=86400');
    expect((response.body as Buffer).toString('utf8')).toContain('<svg');
    expect(findLinkForUserMock).toHaveBeenCalledWith(LINK_ID, USER_ID);
  });

  it('returns 404 for a link owned by another user', async () => {
    findLinkForUserMock.mockResolvedValue(undefined);

    const response = await request(app)
      .get(`/api/links/${LINK_ID}/qr`)
      .set('Cookie', authCookie(OTHER_USER_ID));
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('LINK_NOT_FOUND');
    expect(findLinkForUserMock).toHaveBeenCalledWith(LINK_ID, OTHER_USER_ID);
  });

  it('rejects a malformed link id', async () => {
    const response = await request(app).get('/api/links/not-a-uuid/qr').set('Cookie', authCookie());
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.fields?.id).toEqual(expect.any(String));
    expect(findLinkForUserMock).not.toHaveBeenCalled();
  });
});
