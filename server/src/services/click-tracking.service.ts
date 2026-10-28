import type { Request } from 'express';
import type { ClickQueue } from '../lib/click-queue.js';
import { buildClickMetadata } from '../lib/click-metadata.js';

/**
 * Build a click event from the request and hand it to the in-process queue.
 * This runs after the 302 has been written, and never performs I/O itself.
 */
export function recordClick(queue: ClickQueue, linkId: string, req: Request): void {
  const now = new Date();
  const metadata = buildClickMetadata({
    ip: req.ip ?? '',
    userAgent: req.get('user-agent') ?? '',
    referrer: req.get('referer'),
    now,
  });

  queue.enqueue({
    linkId,
    clickedAt: now,
    ...metadata,
  });
}
