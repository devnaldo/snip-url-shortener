import { Router } from 'express';
import { redirectToDestination } from '../controllers/redirect.controller.js';

export function createRedirectRouter(): Router {
  const router = Router();

  router.get('/:alias', redirectToDestination);

  return router;
}
