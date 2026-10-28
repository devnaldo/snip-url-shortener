import { createServer } from 'node:http';
import { createApp, getClickQueue } from './app.js';
import { env } from './config/env.js';
import { closeDb } from './db/client.js';
import { logger } from './lib/logger.js';

const app = createApp();
const clickQueue = getClickQueue(app);
const server = createServer(app);

clickQueue.start();

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Snip API listening');
});

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals): void {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info({ signal }, 'Shutting down');

  const forceTimer = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10_000);
  forceTimer.unref();

  server.close((error) => {
    clearTimeout(forceTimer);

    void (async () => {
      try {
        await clickQueue.stop();
      } catch (queueError) {
        logger.error({ err: queueError }, 'Error while flushing click queue');
      }

      try {
        await closeDb();
      } catch (dbError) {
        logger.error({ err: dbError }, 'Error while closing database pool');
      }

      if (error) {
        logger.error({ err: error }, 'Error while closing HTTP server');
        process.exit(1);
      }

      logger.info('Shutdown complete');
      process.exit(0);
    })();
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'Unhandled promise rejection');
  process.exit(1);
});
