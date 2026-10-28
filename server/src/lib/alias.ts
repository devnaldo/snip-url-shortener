import { nanoid } from 'nanoid';

export const ALIAS_MIN_LENGTH = 3;
export const ALIAS_MAX_LENGTH = 32;
export const GENERATED_ALIAS_LENGTH = 7;

export const RESERVED_ALIASES: readonly string[] = [
  'api',
  'health',
  'login',
  'register',
  'dashboard',
  'admin',
  'static',
  'assets',
  'favicon.ico',
  'robots.txt',
];

const ALIAS_PATTERN = /^[A-Za-z0-9_-]+$/;
const PUBLIC_ALIAS_PATTERN = new RegExp(`^[A-Za-z0-9_-]{${ALIAS_MIN_LENGTH},${ALIAS_MAX_LENGTH}}$`);
const reservedAliases = new Set(RESERVED_ALIASES.map((alias) => alias.toLowerCase()));

export type AliasValidation = { valid: true } | { valid: false; message: string };

/**
 * Custom aliases are case-sensitive for uniqueness, but the reserved list is
 * checked case-insensitively so `/API` cannot shadow the API routes.
 */
export function validateAlias(alias: string): AliasValidation {
  if (alias.length < ALIAS_MIN_LENGTH || alias.length > ALIAS_MAX_LENGTH) {
    return {
      valid: false,
      message: `Alias must be between ${ALIAS_MIN_LENGTH} and ${ALIAS_MAX_LENGTH} characters.`,
    };
  }

  if (!ALIAS_PATTERN.test(alias)) {
    return {
      valid: false,
      message: 'Alias may only contain letters, numbers, hyphens, and underscores.',
    };
  }

  if (reservedAliases.has(alias.toLowerCase())) {
    return { valid: false, message: 'This alias is reserved.' };
  }

  return { valid: true };
}

/**
 * Whether an alias could exist in the database at all. Used by the redirect
 * route to answer malformed aliases without a query.
 */
export function isWellFormedAlias(alias: string): boolean {
  return PUBLIC_ALIAS_PATTERN.test(alias);
}

/** Generate a 7-character alias. Uniqueness is enforced by the database. */
export function generateAlias(): string {
  return nanoid(GENERATED_ALIAS_LENGTH);
}
