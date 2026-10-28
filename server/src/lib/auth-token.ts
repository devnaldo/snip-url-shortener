import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/** Seven days. The cookie max-age is derived from the same value. */
export const AUTH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60;

export function signAuthToken(userId: string): string {
  return jwt.sign({}, env.JWT_SECRET, {
    algorithm: 'HS256',
    subject: userId,
    expiresIn: AUTH_TOKEN_TTL_SECONDS,
  });
}

/**
 * Verify a token and return its subject. Any malformed, expired, or
 * incorrectly signed token is treated as unauthenticated.
 */
export function verifyAuthToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });

    if (typeof payload === 'string') {
      return null;
    }

    const subject: unknown = payload.sub;

    return typeof subject === 'string' && subject.length > 0 ? subject : null;
  } catch {
    return null;
  }
}
