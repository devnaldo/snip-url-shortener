import { env } from '../config/env.js';

/** Build the public short URL for an alias. */
export function buildShortUrl(alias: string): string {
  return `${env.BASE_URL.replace(/\/+$/, '')}/${alias}`;
}
