import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(moduleDir, '../../..');

/**
 * Load the first available .env file. The repository keeps a single root .env
 * so that server and tooling share one source of truth. `process.cwd()` covers
 * running from the server directory as well as the repository root.
 */
function loadEnvFiles(): void {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '..', '.env'),
    resolve(repoRoot, '.env'),
  ];

  for (const path of new Set(candidates)) {
    if (existsSync(path)) {
      dotenv.config({ path, quiet: true });
    }
  }
}

loadEnvFiles();
