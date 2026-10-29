import { statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Express, NextFunction, Request, Response } from 'express';

/**
 * Built Vite client. Resolved from this module rather than the process cwd so
 * it works from `server/src` (tsx) and `server/dist` (compiled). Both are two
 * levels below the repository root.
 */
export const CLIENT_DIST_DIR = fileURLToPath(new URL('../../../client/dist', import.meta.url));

const ASSETS_DIRECTORY = `assets${path.sep}`;
const HASHED_ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable';
const HTML_CACHE_CONTROL = 'no-cache';

const SPA_PATHS = ['/', '/login', '/register'];
// Only the client's `/links/:id/analytics` route lives under this prefix. Any
// other single-segment path must still reach the alias redirect router.
const SPA_LINKS_ROUTE = /^\/links\//;

function indexHtmlPath(): string {
  return path.join(CLIENT_DIST_DIR, 'index.html');
}

function isFile(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

/** True when a built client with an entry point is available to serve. */
export function hasClientBuild(): boolean {
  try {
    if (!statSync(CLIENT_DIST_DIR).isDirectory()) {
      return false;
    }
  } catch {
    return false;
  }

  return isFile(indexHtmlPath());
}

/**
 * Serve the built client when it exists. The static middleware only claims
 * files that are actually present, and the fallback claims an explicit set of
 * client routes, so aliases and API routes keep their existing behaviour.
 */
export function mountClientApp(app: Express): void {
  if (!hasClientBuild()) {
    return;
  }

  app.use(
    express.static(CLIENT_DIST_DIR, {
      index: false,
      fallthrough: true,
      setHeaders(res, filePath) {
        const relativePath = path.relative(CLIENT_DIST_DIR, filePath);

        if (relativePath === 'index.html') {
          res.setHeader('Cache-Control', HTML_CACHE_CONTROL);
        } else if (relativePath.startsWith(ASSETS_DIRECTORY)) {
          res.setHeader('Cache-Control', HASHED_ASSET_CACHE_CONTROL);
        }
      },
    }),
  );

  function serveIndex(_req: Request, res: Response, next: NextFunction): void {
    res.setHeader('Cache-Control', HTML_CACHE_CONTROL);
    // Express forwards sendFile errors to the centralized error handler.
    res.sendFile(indexHtmlPath(), (error) => {
      if (error) {
        next(error);
      }
    });
  }

  app.get(SPA_PATHS, serveIndex);
  app.get(SPA_LINKS_ROUTE, serveIndex);
}
