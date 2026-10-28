import type { Request, Response } from 'express';
import type { ClickQueue } from '../lib/click-queue.js';
import { renderNoticePage } from '../lib/html-page.js';
import { logger } from '../lib/logger.js';
import { recordClick } from '../services/click-tracking.service.js';
import { resolveAlias } from '../services/redirect.service.js';

function sendNotice(
  res: Response,
  options: { statusCode: 404 | 410; title: string; heading: string; message: string },
): void {
  res
    .status(options.statusCode)
    .type('html')
    .set('Cache-Control', 'no-store')
    .send(renderNoticePage(options));
}

export async function redirectToDestination(req: Request, res: Response): Promise<void> {
  const { alias } = req.params;

  if (typeof alias !== 'string') {
    sendNotice(res, {
      statusCode: 404,
      title: 'Link not found',
      heading: 'This link does not exist',
      message: 'The short link you requested could not be found.',
    });
    return;
  }

  const resolution = await resolveAlias(alias);

  switch (resolution.kind) {
    case 'not-found':
      sendNotice(res, {
        statusCode: 404,
        title: 'Link not found',
        heading: 'This link does not exist',
        message: `The short link “${alias}” could not be found.`,
      });
      return;

    case 'expired':
      sendNotice(res, {
        statusCode: 410,
        title: 'Link expired',
        heading: 'This link has expired',
        message:
          'The person who created this short link set an expiry date, and that date has passed.',
      });
      return;

    case 'disabled':
      sendNotice(res, {
        statusCode: 410,
        title: 'Link disabled',
        heading: 'This link has been disabled',
        message: 'The person who created this short link has turned it off.',
      });
      return;

    case 'redirect':
      // 302 (not 301) keeps every click flowing through the API so analytics
      // stay complete. The click is enqueued after the response is written.
      res.set('Cache-Control', 'no-store');
      res.redirect(302, resolution.destinationUrl);

      try {
        recordClick(req.app.locals.clickQueue as ClickQueue, resolution.linkId, req);
      } catch (error) {
        logger.error({ err: error }, 'Failed to enqueue click event');
      }
  }
}
