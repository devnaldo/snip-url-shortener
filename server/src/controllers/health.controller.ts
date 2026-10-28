import type { Request, Response } from 'express';

export function getHealth(_req: Request, res: Response): void {
  res.status(200).json({
    status: 'ok',
    service: 'snip-api',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
