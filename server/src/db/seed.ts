import bcrypt from 'bcrypt';
import { closeDb, db } from './client.js';
import { links, users } from './schema.js';
import { logger } from '../lib/logger.js';

export const DEMO_EMAIL = 'demo@snip.local';
export const DEMO_PASSWORD = 'demo-password';

async function seed(): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const [user] = await db
    .insert(users)
    .values({ email: DEMO_EMAIL, passwordHash })
    .onConflictDoUpdate({ target: users.email, set: { passwordHash } })
    .returning();

  if (!user) {
    throw new Error('Failed to create the demo user');
  }

  await db
    .insert(links)
    .values([
      {
        userId: user.id,
        alias: 'demo',
        destinationUrl: 'https://github.com/drizzle-team/drizzle-orm',
      },
      {
        userId: user.id,
        alias: 'postgres',
        destinationUrl: 'https://www.postgresql.org/docs/',
      },
    ])
    .onConflictDoNothing({ target: links.alias });

  logger.info({ email: user.email }, 'Seed complete');
}

seed()
  .catch((error: unknown) => {
    logger.error({ err: error }, 'Seed failed');
    process.exitCode = 1;
  })
  .finally(() => closeDb());
