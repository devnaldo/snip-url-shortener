import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// The repository keeps a single .env at its root. npm workspaces run this
// config from ./server, so try both locations before falling back to defaults.
loadEnv({ path: '../.env', quiet: true });
loadEnv({ path: '.env', quiet: true });

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgresql://snip:snip@localhost:5432/snip',
  },
  strict: true,
  verbose: true,
});
