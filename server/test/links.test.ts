import type { Express } from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { Link } from '../src/db/schema.js';
import { AUTH_COOKIE_NAME } from '../src/lib/auth-cookie.js';
import { signAuthToken } from '../src/lib/auth-token.js';
import {
  countLinksByUser,
  deleteLinkForUser,
  findLinkForUser,
  findLinksByUser,
  insertLink,
  updateLinkForUser,
} from '../src/repositories/links.repository.js';

vi.mock('../src/repositories/links.repository.js', () => ({
  insertLink: vi.fn(),
  findLinksByUser: vi.fn(),
  countLinksByUser: vi.fn(),
  findLinkForUser: vi.fn(),
  updateLinkForUser: vi.fn(),
  deleteLinkForUser: vi.fn(),
}));

const insertLinkMock = vi.mocked(insertLink);
const findLinksByUserMock = vi.mocked(findLinksByUser);
const countLinksByUserMock = vi.mocked(countLinksByUser);
const findLinkForUserMock = vi.mocked(findLinkForUser);
const updateLinkForUserMock = vi.mocked(updateLinkForUser);
const deleteLinkForUserMock = vi.mocked(deleteLinkForUser);

const USER_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_USER_ID = '33333333-3333-4333-8333-333333333333';
const LINK_ID = '22222222-2222-4222-8222-222222222222';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const UPDATED_AT = new Date('2026-01-02T00:00:00.000Z');

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
  links: Array<LinkBody & { clickCount: number }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

let app: Express;

beforeEach(() => {
  vi.resetAllMocks();
  app = createApp();
});

function authCookie(userId: string = USER_ID): string {
  return `${AUTH_COOKIE_NAME}=${signAuthToken(userId)}`;
}

function makeLink(overrides: Partial<Link> = {}): Link {
  return {
    id: LINK_ID,
    userId: USER_ID,
    alias: 'abc1234',
    destinationUrl: 'https://example.com',
    isActive: true,
    expiresAt: null,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

function uniqueViolation(): Error & { code: string } {
  return Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
  });
}

function futureIso(): string {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

describe('POST /api/links', () => {
  it('requires authentication', async () => {
    const response = await request(app)
      .post('/api/links')
      .send({ destinationUrl: 'https://example.com' });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(insertLinkMock).not.toHaveBeenCalled();
  });

  it('creates a link with a custom alias and expiry', async () => {
    const expiresAt = futureIso();
    insertLinkMock.mockImplementation((input) =>
      Promise.resolve(
        makeLink({
          alias: input.alias,
          destinationUrl: input.destinationUrl,
          expiresAt: input.expiresAt,
        }),
      ),
    );

    const response = await request(app).post('/api/links').set('Cookie', authCookie()).send({
      destinationUrl: 'https://example.com/path',
      alias: 'my-link',
      expiresAt,
    });
    const body = response.body as LinkResponse;

    expect(response.status).toBe(201);
    expect(body.link).toMatchObject({
      id: LINK_ID,
      alias: 'my-link',
      shortUrl: 'http://localhost:3000/my-link',
      destinationUrl: 'https://example.com/path',
      isActive: true,
      expiresAt,
    });

    const record = insertLinkMock.mock.calls[0]?.[0];

    if (!record) {
      throw new Error('Expected a link insert');
    }

    expect(record).toEqual({
      userId: USER_ID,
      alias: 'my-link',
      destinationUrl: 'https://example.com/path',
      expiresAt: new Date(expiresAt),
    });
  });

  it('generates a 7-character alias when none is supplied', async () => {
    insertLinkMock.mockImplementation((input) =>
      Promise.resolve(makeLink({ alias: input.alias, destinationUrl: input.destinationUrl })),
    );

    const response = await request(app)
      .post('/api/links')
      .set('Cookie', authCookie())
      .send({ destinationUrl: 'https://example.com/auto' });
    const body = response.body as LinkResponse;

    expect(response.status).toBe(201);
    expect(body.link.alias).toMatch(/^[A-Za-z0-9_-]{7}$/);
    expect(insertLinkMock).toHaveBeenCalledTimes(1);
  });

  it('retries generated aliases after a unique-constraint collision', async () => {
    let attempts = 0;

    insertLinkMock.mockImplementation((input) => {
      attempts += 1;

      if (attempts <= 2) {
        return Promise.reject(uniqueViolation());
      }

      return Promise.resolve(
        makeLink({ alias: input.alias, destinationUrl: input.destinationUrl }),
      );
    });

    const response = await request(app)
      .post('/api/links')
      .set('Cookie', authCookie())
      .send({ destinationUrl: 'https://example.com/retry' });
    const body = response.body as LinkResponse;

    expect(response.status).toBe(201);
    expect(body.link.alias).toHaveLength(7);
    expect(insertLinkMock).toHaveBeenCalledTimes(3);
  });

  it('returns 409 when a custom alias is taken', async () => {
    insertLinkMock.mockRejectedValue(uniqueViolation());

    const response = await request(app)
      .post('/api/links')
      .set('Cookie', authCookie())
      .send({ destinationUrl: 'https://example.com', alias: 'taken' });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('ALIAS_TAKEN');
    expect(body.error.fields?.alias).toEqual(expect.any(String));
    expect(insertLinkMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['javascript scheme', 'javascript:alert(1)'],
    ['data scheme', 'data:text/plain,hello'],
    ['ftp scheme', 'ftp://example.com'],
    ['relative URL', '/path'],
    ['credentials', 'https://user:pass@example.com'],
    ['localhost', 'http://localhost:3000'],
    ['loopback address', 'http://127.0.0.1'],
    ['private address', 'http://192.168.1.1'],
    ['own host', 'http://localhost:3000/loop'],
  ])('rejects an invalid destination (%s)', async (_label, destinationUrl) => {
    const response = await request(app)
      .post('/api/links')
      .set('Cookie', authCookie())
      .send({ destinationUrl });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields?.destinationUrl).toEqual(expect.any(String));
    expect(insertLinkMock).not.toHaveBeenCalled();
  });

  it.each([
    ['too short', 'ab'],
    ['invalid characters', 'bad alias'],
    ['reserved', 'admin'],
    ['reserved uppercase', 'API'],
  ])('rejects an invalid alias (%s)', async (_label, alias) => {
    const response = await request(app)
      .post('/api/links')
      .set('Cookie', authCookie())
      .send({ destinationUrl: 'https://example.com', alias });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields?.alias).toEqual(expect.any(String));
    expect(insertLinkMock).not.toHaveBeenCalled();
  });

  it('rejects an expiry in the past', async () => {
    const response = await request(app)
      .post('/api/links')
      .set('Cookie', authCookie())
      .send({
        destinationUrl: 'https://example.com',
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields?.expiresAt).toEqual(expect.any(String));
    expect(insertLinkMock).not.toHaveBeenCalled();
  });

  it('rejects an expiry that is not an ISO timestamp', async () => {
    const response = await request(app)
      .post('/api/links')
      .set('Cookie', authCookie())
      .send({ destinationUrl: 'https://example.com', expiresAt: 'tomorrow' });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.fields?.expiresAt).toEqual(expect.any(String));
  });
});

describe('GET /api/links', () => {
  it('requires authentication', async () => {
    const response = await request(app).get('/api/links');

    expect(response.status).toBe(401);
    expect(findLinksByUserMock).not.toHaveBeenCalled();
  });

  it('lists only the current user links with click counts and pagination', async () => {
    findLinksByUserMock.mockResolvedValue([{ ...makeLink(), clickCount: 5 }]);
    countLinksByUserMock.mockResolvedValue(1);

    const response = await request(app).get('/api/links').set('Cookie', authCookie());
    const body = response.body as ListResponse;

    expect(response.status).toBe(200);
    expect(body.links).toHaveLength(1);
    expect(body.links[0]?.clickCount).toBe(5);
    expect(body.links[0]?.alias).toBe('abc1234');
    expect(body.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
    expect(findLinksByUserMock).toHaveBeenCalledWith(USER_ID, 20, 0);
    expect(countLinksByUserMock).toHaveBeenCalledWith(USER_ID);
  });

  it('applies page and limit to the query', async () => {
    findLinksByUserMock.mockResolvedValue([]);
    countLinksByUserMock.mockResolvedValue(11);

    const response = await request(app)
      .get('/api/links?page=2&limit=10')
      .set('Cookie', authCookie());
    const body = response.body as ListResponse;

    expect(response.status).toBe(200);
    expect(body.pagination).toEqual({ page: 2, limit: 10, total: 11, totalPages: 2 });
    expect(findLinksByUserMock).toHaveBeenCalledWith(USER_ID, 10, 10);
  });

  it.each([
    ['page below one', 'page=0', 'page'],
    ['non-numeric page', 'page=abc', 'page'],
    ['limit above maximum', 'limit=101', 'limit'],
    ['limit below one', 'limit=0', 'limit'],
  ])('rejects invalid pagination (%s)', async (_label, query, field) => {
    const response = await request(app).get(`/api/links?${query}`).set('Cookie', authCookie());
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields?.[field]).toEqual(expect.any(String));
    expect(findLinksByUserMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/links/:id', () => {
  it('returns an owned link', async () => {
    findLinkForUserMock.mockResolvedValue(makeLink());

    const response = await request(app).get(`/api/links/${LINK_ID}`).set('Cookie', authCookie());
    const body = response.body as LinkResponse;

    expect(response.status).toBe(200);
    expect(body.link.id).toBe(LINK_ID);
    expect(findLinkForUserMock).toHaveBeenCalledWith(LINK_ID, USER_ID);
  });

  it('returns 404 for another user link', async () => {
    findLinkForUserMock.mockResolvedValue(undefined);

    const response = await request(app)
      .get(`/api/links/${LINK_ID}`)
      .set('Cookie', authCookie(OTHER_USER_ID));
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('LINK_NOT_FOUND');
    expect(findLinkForUserMock).toHaveBeenCalledWith(LINK_ID, OTHER_USER_ID);
  });

  it('rejects a malformed id', async () => {
    const response = await request(app).get('/api/links/not-a-uuid').set('Cookie', authCookie());
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.fields?.id).toEqual(expect.any(String));
    expect(findLinkForUserMock).not.toHaveBeenCalled();
  });
});

describe('PATCH /api/links/:id', () => {
  it('updates destination, active state, and clears expiry', async () => {
    updateLinkForUserMock.mockResolvedValue(
      makeLink({ destinationUrl: 'https://new.example.com', isActive: false }),
    );

    const response = await request(app)
      .patch(`/api/links/${LINK_ID}`)
      .set('Cookie', authCookie())
      .send({
        destinationUrl: 'https://new.example.com',
        isActive: false,
        expiresAt: null,
      });
    const body = response.body as LinkResponse;

    expect(response.status).toBe(200);
    expect(body.link).toMatchObject({
      destinationUrl: 'https://new.example.com',
      isActive: false,
      expiresAt: null,
    });

    const args = updateLinkForUserMock.mock.calls[0];

    if (!args) {
      throw new Error('Expected an update call');
    }

    expect(args[0]).toBe(LINK_ID);
    expect(args[1]).toBe(USER_ID);
    expect(args[2]).toMatchObject({
      destinationUrl: 'https://new.example.com',
      isActive: false,
      expiresAt: null,
    });
    expect(args[2].updatedAt).toBeInstanceOf(Date);
  });

  it('rejects an empty update', async () => {
    const response = await request(app)
      .patch(`/api/links/${LINK_ID}`)
      .set('Cookie', authCookie())
      .send({});
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields?._root).toEqual(expect.any(String));
    expect(updateLinkForUserMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid destination', async () => {
    const response = await request(app)
      .patch(`/api/links/${LINK_ID}`)
      .set('Cookie', authCookie())
      .send({ destinationUrl: 'http://127.0.0.1' });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.fields?.destinationUrl).toEqual(expect.any(String));
    expect(updateLinkForUserMock).not.toHaveBeenCalled();
  });

  it('rejects an expiry in the past', async () => {
    const response = await request(app)
      .patch(`/api/links/${LINK_ID}`)
      .set('Cookie', authCookie())
      .send({ expiresAt: new Date(Date.now() - 60_000).toISOString() });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.fields?.expiresAt).toEqual(expect.any(String));
  });

  it('returns 404 for a link the user does not own', async () => {
    updateLinkForUserMock.mockResolvedValue(undefined);

    const response = await request(app)
      .patch(`/api/links/${LINK_ID}`)
      .set('Cookie', authCookie(OTHER_USER_ID))
      .send({ isActive: false });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('LINK_NOT_FOUND');
    expect(updateLinkForUserMock.mock.calls[0]?.[1]).toBe(OTHER_USER_ID);
  });
});

describe('DELETE /api/links/:id', () => {
  it('deletes an owned link', async () => {
    deleteLinkForUserMock.mockResolvedValue(true);

    const response = await request(app).delete(`/api/links/${LINK_ID}`).set('Cookie', authCookie());

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
    expect(deleteLinkForUserMock).toHaveBeenCalledWith(LINK_ID, USER_ID);
  });

  it('returns 404 when the link is not owned', async () => {
    deleteLinkForUserMock.mockResolvedValue(false);

    const response = await request(app)
      .delete(`/api/links/${LINK_ID}`)
      .set('Cookie', authCookie(OTHER_USER_ID));
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(404);
    expect(body.error.code).toBe('LINK_NOT_FOUND');
    expect(deleteLinkForUserMock).toHaveBeenCalledWith(LINK_ID, OTHER_USER_ID);
  });
});

describe('POST /api/links rate limiting', () => {
  it('limits link creation per user and reports Retry-After', async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const response = await request(app).post('/api/links').set('Cookie', authCookie()).send({});
      expect(response.status).toBe(400);
    }

    const limited = await request(app).post('/api/links').set('Cookie', authCookie()).send({});
    const body = limited.body as ApiErrorBody;

    expect(limited.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after']).toBeDefined();
    expect(insertLinkMock).not.toHaveBeenCalled();
  });

  it('keeps counters separate for different users', async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      await request(app).post('/api/links').set('Cookie', authCookie()).send({});
    }

    const otherUser = await request(app)
      .post('/api/links')
      .set('Cookie', authCookie(OTHER_USER_ID))
      .send({});
    const body = otherUser.body as ApiErrorBody;

    expect(otherUser.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
