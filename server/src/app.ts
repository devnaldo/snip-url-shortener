import cors from 'cors';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { mountClientApp } from './lib/client-assets.js';
import { ClickQueue } from './lib/click-queue.js';
import { logger } from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { insertClicks } from './repositories/clicks.repository.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { createLinksRouter } from './routes/links.routes.js';
import { createRedirectRouter } from './routes/redirect.routes.js';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');

  // Number of reverse-proxy hops to trust when reading the client IP from
  // X-Forwarded-For. 0 (the default) ignores forwarding headers entirely.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          // The QR modal renders authenticated SVG responses from object URLs.
          'img-src': ["'self'", 'data:', 'blob:'],
        },
      },
    }),
  );
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

  const clickQueue = new ClickQueue({ insert: insertClicks });
  app.locals.clickQueue = clickQueue;

  app.use('/health', healthRouter);
  app.use('/api/auth', createAuthRouter());
  app.use('/api/links', createLinksRouter());

  // Serve the built React app when it is present. Static files and the SPA
  // fallback are intentionally mounted before the alias router but after the
  // API routes, and the fallback only claims the client's known routes.
  mountClientApp(app);

  // Mounted last so API and health routes always win over an alias. The
  // router itself only claims a single path segment.
  app.use(createRedirectRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/** The click queue owned by an app instance. */
export function getClickQueue(app: Express): ClickQueue {
  return app.locals.clickQueue as ClickQueue;
}
