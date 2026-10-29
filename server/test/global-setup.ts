import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';

const DEFAULT_TEST_DATABASE_URL = 'postgresql://snip:snip@localhost:5432/snip_test';
const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url));

function testDatabaseUrl(): string {
  return process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;
}

function databaseName(url: URL): string {
  const name = decodeURIComponent(url.pathname.replace(/^\/+/, ''));

  if (!/^[A-Za-z0-9_-]+$/.test(name)) {
    throw new Error(`Refusing to use an unsafe test database name: "${name}"`);
  }

  // Guard rail: integration tests truncate tables, so they must never point at
  // the development or production database.
  if (!name.endsWith('_test')) {
    throw new Error(
      `Refusing to run tests against "${name}". The test database name must end with "_test".`,
    );
  }

  return name;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function canConnect(connectionString: string): Promise<boolean> {
  const client = new Client({ connectionString });

  try {
    await client.connect();
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === '3D000') {
      return false;
    }

    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function ensureDatabase(connectionString: string): Promise<void> {
  const parsed = new URL(connectionString);
  const name = databaseName(parsed);

  if (await canConnect(connectionString)) {
    return;
  }

  const adminUrl = new URL(connectionString);
  adminUrl.pathname = '/postgres';

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();

  try {
    await admin.query(`CREATE DATABASE ${quoteIdentifier(name)}`);
  } catch (error) {
    // Another worker may have created it between the existence check and the
    // CREATE. Ignore only the duplicate-database error.
    if (!(error instanceof Error && 'code' in error && error.code === '42P04')) {
      throw error;
    }
  } finally {
    await admin.end();
  }
}

async function applyMigrations(connectionString: string): Promise<void> {
  const pool = new Pool({ connectionString, max: 1 });

  try {
    await migrate(drizzle(pool), { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await pool.end();
  }
}

export default async function setup(): Promise<void> {
  const connectionString = testDatabaseUrl();

  // Fail fast with the guard-rail message before touching anything.
  databaseName(new URL(connectionString));

  await ensureDatabase(connectionString);
  await applyMigrations(connectionString);
}
