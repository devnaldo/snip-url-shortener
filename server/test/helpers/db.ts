import { eq, sql } from 'drizzle-orm';
import { env } from '../../src/config/env.js';
import { db } from '../../src/db/client.js';
import { clicks, links, users } from '../../src/db/schema.js';
import type { Click, Link, NewClick } from '../../src/db/schema.js';
import { AUTH_COOKIE_NAME } from '../../src/lib/auth-cookie.js';
import { signAuthToken } from '../../src/lib/auth-token.js';

// Auth is exercised through signed cookies in these tests; passwords are
// covered by the dedicated auth suite.
const TEST_PASSWORD_HASH = '$2b$12$F66rEmKhteuHuHdozsiWw.grWQe3azluRzBKEcV0x1uiMU4HhO6ay';

function assertTestDatabase(): void {
  const name = decodeURIComponent(new URL(env.DATABASE_URL).pathname.replace(/^\/+/, ''));

  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to reset "${name}". Integration tests require a database ending in "_test".`,
    );
  }
}

/** Remove all rows so every test starts from a known state. */
export async function resetDatabase(): Promise<void> {
  assertTestDatabase();
  await db.execute(sql.raw('TRUNCATE TABLE clicks, links, users RESTART IDENTITY CASCADE'));
}

export async function createTestUser(
  email = 'user@example.com',
): Promise<{ id: string; email: string }> {
  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: TEST_PASSWORD_HASH })
    .returning({ id: users.id, email: users.email });

  if (!user) {
    throw new Error('Failed to insert test user');
  }

  return user;
}

export function authCookieFor(userId: string): string {
  return `${AUTH_COOKIE_NAME}=${signAuthToken(userId)}`;
}

export interface TestLinkInput {
  userId: string;
  alias: string;
  destinationUrl?: string;
  isActive?: boolean;
  expiresAt?: Date | null;
  createdAt?: Date;
}

export async function createTestLink(input: TestLinkInput): Promise<Link> {
  const [link] = await db
    .insert(links)
    .values({
      userId: input.userId,
      alias: input.alias,
      destinationUrl: input.destinationUrl ?? 'https://example.com',
      isActive: input.isActive ?? true,
      expiresAt: input.expiresAt ?? null,
      ...(input.createdAt ? { createdAt: input.createdAt, updatedAt: input.createdAt } : {}),
    })
    .returning();

  if (!link) {
    throw new Error('Failed to insert test link');
  }

  return link;
}

export async function insertTestClick(
  linkId: string,
  overrides: Partial<Omit<NewClick, 'linkId'>> = {},
): Promise<void> {
  await db.insert(clicks).values({
    linkId,
    clickedAt: new Date(),
    referrerHost: null,
    referrerUrl: null,
    deviceType: 'desktop',
    browser: 'Chrome',
    os: 'Linux',
    visitorHash: 'a'.repeat(64),
    ...overrides,
  });
}

export async function listClicks(linkId: string): Promise<Click[]> {
  return db.select().from(clicks).where(eq(clicks.linkId, linkId)).orderBy(clicks.id);
}

export async function countClicks(linkId?: string): Promise<number> {
  const query = db.select({ total: sql<number>`count(*)::int` }).from(clicks);
  const [row] = linkId ? await query.where(eq(clicks.linkId, linkId)) : await query;

  return row?.total ?? 0;
}

export async function countLinks(userId?: string): Promise<number> {
  const query = db.select({ total: sql<number>`count(*)::int` }).from(links);
  const [row] = userId ? await query.where(eq(links.userId, userId)) : await query;

  return row?.total ?? 0;
}
