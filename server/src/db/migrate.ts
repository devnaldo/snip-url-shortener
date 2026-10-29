import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

// Resolved from this file so it works from src (tsx) and dist (compiled):
// <server>/drizzle is two levels above <server>/{src,dist}/db.
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../../drizzle', import.meta.url));

async function runMigrations(): Promise<void> {
  const pool = new Pool({ connectionString: env.DATABASE_URL, max: 1 });

  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
    logger.info({ migrationsFolder: MIGRATIONS_FOLDER }, 'Database migrations applied');
  } finally {
    await pool.end();
  }
}

try {
  await runMigrations();
} catch (error) {
  logger.error({ err: error }, 'Database migration failed');
  process.exitCode = 1;
}
