import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import {
  createLink,
  deleteLink,
  getLink,
  listLinks,
  updateLink,
} from '../controllers/links.controller.js';
import { createRateLimitHandler } from '../middleware/rate-limit.js';
import { requireAuth } from '../middleware/require-auth.js';

export function createLinksRouter(): Router {
  const createLinkLimiter = rateLimit({
    windowMs: env.LINK_RATE_LIMIT_WINDOW_MS,
    limit: env.LINK_RATE_LIMIT_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    // requireAuth runs first, so every request has a user id.
    keyGenerator: (req) => req.auth?.userId ?? 'unauthenticated',
    handler: createRateLimitHandler({
      code: 'RATE_LIMITED',
      message: 'Too many links created. Please try again later.',
    }),
  });

  const router = Router();

  router.use(requireAuth);
  router.post('/', createLinkLimiter, createLink);
  router.get('/', listLinks);
  router.get('/:id', getLink);
  router.patch('/:id', updateLink);
  router.delete('/:id', deleteLink);

  return router;
}
