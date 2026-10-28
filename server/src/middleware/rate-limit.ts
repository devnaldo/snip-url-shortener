import type { NextFunction, Request, Response } from 'express';
import type { Options } from 'express-rate-limit';

export interface RateLimitError {
  code: string;
  message: string;
}

export function createRateLimitHandler({ code, message }: RateLimitError) {
  return (_req: Request, res: Response, _next: NextFunction, options: Options): void => {
    res.setHeader('Retry-After', String(Math.ceil(options.windowMs / 1000)));
    res.status(429).json({ error: { code, message } });
  };
}
