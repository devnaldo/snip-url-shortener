import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import type { User } from '../db/schema.js';

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user;
}

export async function findUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return user;
}

export async function insertUser(input: CreateUserInput): Promise<User> {
  const [user] = await db.insert(users).values(input).returning();

  if (!user) {
    throw new Error('Failed to insert user');
  }

  return user;
}
