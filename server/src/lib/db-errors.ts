/**
 * Detect PostgreSQL unique-constraint violations without depending on the
 * concrete error class. Drizzle wraps driver errors, so walk the cause chain.
 */
export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;

  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== 'object' || current === null) {
      return false;
    }

    const { code, cause } = current as { code?: unknown; cause?: unknown };

    if (code === '23505') {
      return true;
    }

    current = cause;
  }

  return false;
}
