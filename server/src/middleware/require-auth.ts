import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { AUTH_COOKIE_NAME } from '../lib/auth-cookie.js';
import { verifyAuthToken } from '../lib/auth-token.js';

function readCookie(req: Request, name: string): string | undefined {
  const cookies: unknown = req.cookies;

  if (typeof cookies !== 'object' || cookies === null || !(name in cookies)) {
    return undefined;
  }

  const value = (cookies as Record<string, unknown>)[name];
  return typeof value === 'string' ? value : undefined;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readCookie(req, AUTH_COOKIE_NAME);

  if (!token) {
    next(new AppError(401, 'UNAUTHENTICATED', 'Authentication required.'));
    return;
  }

  const userId = verifyAuthToken(token);

  if (!userId) {
    next(new AppError(401, 'UNAUTHENTICATED', 'Your session is invalid or has expired.'));
    return;
  }

  req.auth = { userId };
  next();
}
