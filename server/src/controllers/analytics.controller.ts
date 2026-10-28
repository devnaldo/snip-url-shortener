import type { Request, Response } from 'express';
import { parseInput } from '../lib/validation.js';
import { getAuthContext } from '../middleware/require-auth.js';
import { getLinkAnalytics as getAnalytics } from '../services/analytics.service.js';
import { analyticsQuerySchema } from '../validation/analytics.schema.js';
import { linkIdParamsSchema } from '../validation/link.schema.js';

export async function getLinkAnalytics(req: Request, res: Response): Promise<void> {
  const { id } = parseInput(linkIdParamsSchema, req.params as unknown);
  const { range } = parseInput(analyticsQuerySchema, req.query as unknown);
  const analytics = await getAnalytics(getAuthContext(req).userId, id, range);

  res.status(200).json(analytics);
}
