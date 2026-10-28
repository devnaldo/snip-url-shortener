import bcrypt from 'bcrypt';
import type { Express } from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import type { User } from '../src/db/schema.js';
import { AUTH_COOKIE_NAME } from '../src/lib/auth-cookie.js';
import { signAuthToken } from '../src/lib/auth-token.js';
import { findUserByEmail, findUserById, insertUser } from '../src/repositories/users.repository.js';

vi.mock('../src/repositories/users.repository.js', () => ({
  findUserByEmail: vi.fn(),
  findUserById: vi.fn(),
  insertUser: vi.fn(),
}));

const findByEmail = vi.mocked(findUserByEmail);
const findById = vi.mocked(findUserById);
const createUser = vi.mocked(insertUser);

const USER_ID = '11111111-1111-4111-8111-111111111111';
const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

interface UserResponse {
  user: {
    id: string;
    email: string;
    createdAt: string;
  };
}

let app: Express;
let storedPasswordHash = '';

beforeAll(async () => {
  // A low cost keeps the suite quick; production hashes are cost 12.
  storedPasswordHash = await bcrypt.hash('correct-password', 4);
});

beforeEach(() => {
  vi.resetAllMocks();
  app = createApp();
});

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    email: 'user@example.com',
    passwordHash: storedPasswordHash,
    createdAt: CREATED_AT,
    ...overrides,
  };
}

function firstSetCookie(headers: object): string {
  const value = (headers as Record<string, unknown>)['set-cookie'];

  if (!Array.isArray(value) || typeof value[0] !== 'string') {
    throw new Error('Expected a Set-Cookie header');
  }

  const pair = value[0].split(';')[0];

  if (!pair) {
    throw new Error('Malformed Set-Cookie header');
  }

  return pair;
}

function fullSetCookie(headers: object): string {
  const value = (headers as Record<string, unknown>)['set-cookie'];

  if (!Array.isArray(value) || typeof value[0] !== 'string') {
    throw new Error('Expected a Set-Cookie header');
  }

  return value[0];
}

describe('POST /api/auth/register', () => {
  it('creates a user, hashes the password, and sets an httpOnly cookie', async () => {
    findByEmail.mockResolvedValue(undefined);
    createUser.mockImplementation((input) =>
      Promise.resolve({
        id: USER_ID,
        email: input.email,
        passwordHash: input.passwordHash,
        createdAt: CREATED_AT,
      }),
    );

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'New@Example.COM', password: 'password123' });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      user: { id: USER_ID, email: 'new@example.com', createdAt: CREATED_AT.toISOString() },
    });
    expect(findByEmail).toHaveBeenCalledWith('new@example.com');

    const input = createUser.mock.calls[0]?.[0];

    if (!input) {
      throw new Error('Expected the repository create call');
    }

    expect(input.passwordHash).not.toBe('password123');
    expect(bcrypt.getRounds(input.passwordHash)).toBe(12);
    expect(await bcrypt.compare('password123', input.passwordHash)).toBe(true);

    expect(firstSetCookie(response.headers)).toMatch(new RegExp(`^${AUTH_COOKIE_NAME}=.+`));
    const setCookie = fullSetCookie(response.headers).toLowerCase();
    expect(setCookie).toContain('httponly');
    expect(setCookie).toContain('samesite=lax');
    expect(setCookie).toContain('path=/');
    expect(setCookie).toContain('max-age=604800');
  });

  it('returns field-level validation errors for invalid input', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'short' });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fields?.email).toEqual(expect.any(String));
    expect(body.error.fields?.password).toEqual(expect.any(String));
    expect(findByEmail).not.toHaveBeenCalled();
  });

  it('rejects an email that is already registered', async () => {
    findByEmail.mockResolvedValue(makeUser());

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({
      error: {
        code: 'EMAIL_TAKEN',
        message: 'An account with this email already exists.',
        fields: { email: 'Email is already registered' },
      },
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('maps a unique-constraint race to EMAIL_TAKEN', async () => {
    findByEmail.mockResolvedValue(undefined);
    createUser.mockRejectedValue(
      Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' }),
    );

    const response = await request(app)
      .post('/api/auth/register')
      .send({ email: 'race@example.com', password: 'password123' });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(409);
    expect(body.error.code).toBe('EMAIL_TAKEN');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with valid credentials and sets the cookie', async () => {
    findByEmail.mockResolvedValue(makeUser());

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'User@Example.com', password: 'correct-password' });
    const body = response.body as UserResponse;

    expect(response.status).toBe(200);
    expect(body.user).toEqual({
      id: USER_ID,
      email: 'user@example.com',
      createdAt: CREATED_AT.toISOString(),
    });
    expect(findByEmail).toHaveBeenCalledWith('user@example.com');
    expect(firstSetCookie(response.headers)).toMatch(new RegExp(`^${AUTH_COOKIE_NAME}=.+`));
  });

  it('rejects a wrong password without setting a cookie', async () => {
    findByEmail.mockResolvedValue(makeUser());

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-password' });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
    expect(response.headers['set-cookie']).toBeUndefined();
  });

  it('rejects an unknown email with the same generic error', async () => {
    findByEmail.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /api/auth/me', () => {
  it('returns the current user for a valid session cookie', async () => {
    findById.mockResolvedValue(makeUser());

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${signAuthToken(USER_ID)}`);
    const body = response.body as UserResponse;

    expect(response.status).toBe(200);
    expect(body.user).toEqual({
      id: USER_ID,
      email: 'user@example.com',
      createdAt: CREATED_AT.toISOString(),
    });
    expect(findById).toHaveBeenCalledWith(USER_ID);
  });

  it('requires a session cookie', async () => {
    const response = await request(app).get('/api/auth/me');
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
    expect(findById).not.toHaveBeenCalled();
  });

  it('rejects an invalid token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${AUTH_COOKIE_NAME}=not-a-jwt`);
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a token whose user no longer exists', async () => {
    findById.mockResolvedValue(undefined);

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${AUTH_COOKIE_NAME}=${signAuthToken(USER_ID)}`);
    const body = response.body as ApiErrorBody;

    expect(response.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHENTICATED');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the auth cookie', async () => {
    const response = await request(app).post('/api/auth/logout');

    expect(response.status).toBe(204);
    const setCookie = fullSetCookie(response.headers).toLowerCase();
    expect(setCookie).toContain(`${AUTH_COOKIE_NAME}=`);
    expect(setCookie).toContain('expires=thu, 01 jan 1970');
  });
});

describe('auth rate limiting', () => {
  it('limits registration attempts per IP', async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = await request(app).post('/api/auth/register').send({});
      expect(response.status).toBe(400);
    }

    const limited = await request(app).post('/api/auth/register').send({});
    const body = limited.body as ApiErrorBody;

    expect(limited.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after']).toBeDefined();
  });

  it('limits login attempts per IP', async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await request(app).post('/api/auth/login').send({});
      expect(response.status).toBe(400);
    }

    const limited = await request(app).post('/api/auth/login').send({});
    const body = limited.body as ApiErrorBody;

    expect(limited.status).toBe(429);
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(limited.headers['retry-after']).toBeDefined();
  });
});
