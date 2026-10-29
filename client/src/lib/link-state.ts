import type { LinkDto, LinkListItem } from '../api/types';

export function applyLinkUpdate(links: LinkListItem[], updated: LinkDto): LinkListItem[] {
  return links.map((link) =>
    link.id === updated.id ? { ...link, ...updated, clickCount: link.clickCount } : link,
  );
}

export type LinkState = 'active' | 'disabled' | 'expired';

export function linkState(link: Pick<LinkDto, 'isActive' | 'expiresAt'>): LinkState {
  if (!link.isActive) {
    return 'disabled';
  }

  const expiresAt = link.expiresAt;

  return expiresAt !== null && new Date(expiresAt).getTime() <= Date.now() ? 'expired' : 'active';
}
