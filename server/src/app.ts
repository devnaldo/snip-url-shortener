import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        callback(null, origin === undefined || origin === env.CLIENT_URL);
      },
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' },
    }),
  );

  app.use('/health', healthRouter);
  app.use('/api/auth', createAuthRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
