import type { CookieOptions, Response } from 'express';
import { env } from '../config/env.js';
import { AUTH_TOKEN_TTL_SECONDS } from './auth-token.js';

export const AUTH_COOKIE_NAME = 'snip_token';

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, baseCookieOptions);
}
