import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, logout, me, register } from '../controllers/auth.controller.js';
import { createRateLimitHandler } from '../middleware/rate-limit.js';
import { requireAuth } from '../middleware/require-auth.js';

export function createAuthRouter(): Router {
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    handler: createRateLimitHandler({
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Please try again later.',
    }),
  });

  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: createRateLimitHandler({
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
