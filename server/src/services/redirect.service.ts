import { isWellFormedAlias } from '../lib/alias.js';
import { getCachedLink, setCachedLink } from '../lib/redirect-cache.js';
import { findLinkByAlias } from '../repositories/links.repository.js';

export type RedirectResolution =
  | { kind: 'redirect'; linkId: string; destinationUrl: string }
  | { kind: 'expired' }
  | { kind: 'disabled' }
  | { kind: 'not-found' };

function isExpired(expiresAt: Date | null, now: Date): boolean {
  return expiresAt !== null && expiresAt.getTime() <= now.getTime();
}

/**
 * Resolve an alias for the redirect path. Serves from the LRU cache when
 * possible, otherwise performs a single indexed lookup and caches the result
 * for 60 seconds. The cache is checked on every request, so an expiry that
 * passes while a link is cached is still enforced.
 */
export async function resolveAlias(alias: string): Promise<RedirectResolution> {
  if (!isWellFormedAlias(alias)) {
    return { kind: 'not-found' };
  }

  const cached = getCachedLink(alias);
  const link = cached ?? (await findLinkByAlias(alias));

  if (!link) {
    return { kind: 'not-found' };
  }

  if (!cached) {
    setCachedLink(alias, {
      id: link.id,
      destinationUrl: link.destinationUrl,
      isActive: link.isActive,
      expiresAt: link.expiresAt,
    });
  }

  if (!link.isActive) {
    return { kind: 'disabled' };
  }

  if (isExpired(link.expiresAt, new Date())) {
    return { kind: 'expired' };
  }

  return { kind: 'redirect', linkId: link.id, destinationUrl: link.destinationUrl };
}
