import { LRUCache } from 'lru-cache';

export const REDIRECT_CACHE_TTL_MS = 60_000;
export const REDIRECT_CACHE_MAX_ENTRIES = 5_000;

export interface CachedLink {
  id: string;
  destinationUrl: string;
  isActive: boolean;
  expiresAt: Date | null;
}

const cache = new LRUCache<string, CachedLink>({
  max: REDIRECT_CACHE_MAX_ENTRIES,
  ttl: REDIRECT_CACHE_TTL_MS,
});

export function getCachedLink(alias: string): CachedLink | undefined {
  return cache.get(alias);
}

export function setCachedLink(alias: string, link: CachedLink): void {
  cache.set(alias, link);
}

/** Drop a cached alias after the link is edited, toggled, or deleted. */
export function invalidateCachedLink(alias: string): void {
  cache.delete(alias);
}

/** Clear every entry. Used by tests and after bulk maintenance. */
export function clearRedirectCache(): void {
  cache.clear();
}
