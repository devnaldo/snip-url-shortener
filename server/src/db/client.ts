import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import * as schema from './schema.js';

// connectionString is passed through unchanged. Managed PostgreSQL providers
// can require TLS with ?sslmode=require; pg negotiates TLS with certificate
// verification, and no ssl.rejectUnauthorized override is set here.
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
});

export const db = drizzle(pool, { schema });

export async function closeDb(): Promise<void> {
  await pool.end();
}
