import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Options } from 'express-rate-limit';
import { login, logout, me, register } from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/require-auth.js';

interface RateLimitMessage {
  code: string;
  message: string;
}

function rateLimitHandler({ code, message }: RateLimitMessage) {
  return (_req: Request, res: Response, _next: NextFunction, options: Options): void => {
    res.setHeader('Retry-After', String(Math.ceil(options.windowMs / 1000)));
    res.status(429).json({ error: { code, message } });
  };
}

export function createAuthRouter(): Router {
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: rateLimitHandler({
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please try again later.',
    }),
  });

  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: rateLimitHandler({
      code: 'RATE_LIMITED',
      message: 'Too many registration attempts. Please try again later.',
    }),
  });

  const router = Router();

  router.post('/register', registerLimiter, register);
  router.post('/login', loginLimiter, login);
  router.post('/logout', logout);
  router.get('/me', requireAuth, me);

  return router;
}
