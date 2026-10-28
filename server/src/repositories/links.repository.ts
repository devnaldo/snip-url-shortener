import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { clicks, links } from '../db/schema.js';
import type { Link } from '../db/schema.js';

export interface CreateLinkRecord {
  userId: string;
  alias: string;
  destinationUrl: string;
  expiresAt: Date | null;
}

export interface UpdateLinkRecord {
  destinationUrl?: string;
  expiresAt?: Date | null;
  isActive?: boolean;
  updatedAt: Date;
}

export interface LinkWithClickCount extends Link {
  clickCount: number;
}

export async function insertLink(input: CreateLinkRecord): Promise<Link> {
  const [link] = await db.insert(links).values(input).returning();

  if (!link) {
    throw new Error('Failed to insert link');
  }

  return link;
}

export async function findLinksByUser(
  userId: string,
  limit: number,
  offset: number,
): Promise<LinkWithClickCount[]> {
  return db
    .select({
      id: links.id,
      userId: links.userId,
      alias: links.alias,
      destinationUrl: links.destinationUrl,
      isActive: links.isActive,
      expiresAt: links.expiresAt,
      createdAt: links.createdAt,
      updatedAt: links.updatedAt,
      clickCount: sql<number>`count(${clicks.id})::int`,
    })
    .from(links)
    .leftJoin(clicks, eq(clicks.linkId, links.id))
    .where(eq(links.userId, userId))
    .groupBy(links.id)
    .orderBy(desc(links.createdAt), desc(links.id))
    .limit(limit)
    .offset(offset);
}

export async function countLinksByUser(userId: string): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(links)
    .where(eq(links.userId, userId));

  return row?.total ?? 0;
}

export async function findLinkByAlias(alias: string): Promise<Link | undefined> {
  const [link] = await db.select().from(links).where(eq(links.alias, alias)).limit(1);

  return link;
}

export async function findLinkForUser(id: string, userId: string): Promise<Link | undefined> {
  const [link] = await db
    .select()
    .from(links)
    .where(and(eq(links.id, id), eq(links.userId, userId)))
    .limit(1);

  return link;
}

export async function updateLinkForUser(
  id: string,
  userId: string,
  patch: UpdateLinkRecord,
): Promise<Link | undefined> {
  const [link] = await db
    .update(links)
    .set(patch)
    .where(and(eq(links.id, id), eq(links.userId, userId)))
    .returning();

  return link;
}

/** Delete an owned link and return its alias so the redirect cache can be invalidated. */
export async function deleteLinkForUser(id: string, userId: string): Promise<string | undefined> {
  const [deleted] = await db
    .delete(links)
    .where(and(eq(links.id, id), eq(links.userId, userId)))
    .returning({ alias: links.alias });

  return deleted?.alias;
}
