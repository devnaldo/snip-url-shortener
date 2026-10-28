import type { Request, Response } from 'express';
import { parseInput } from '../lib/validation.js';
import { getAuthContext } from '../middleware/require-auth.js';
import { generateLinkQr } from '../services/qr.service.js';
import { linkIdParamsSchema } from '../validation/link.schema.js';

export async function getLinkQr(req: Request, res: Response): Promise<void> {
  const { id } = parseInput(linkIdParamsSchema, req.params as unknown);
  const { alias, svg } = await generateLinkQr(getAuthContext(req).userId, id);

  res
    .status(200)
    .set('Content-Type', 'image/svg+xml; charset=utf-8')
    .set('Content-Disposition', `inline; filename="snip-${alias}.svg"`)
    .set('Cache-Control', 'private, max-age=86400')
    .send(svg);
}
