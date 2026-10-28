import type { ZodType } from 'zod';

/**
 * Validate untrusted input (body, params, or query) and return the parsed
 * value. ZodError is handled centrally and converted to the standard
 * VALIDATION_ERROR response.
 */
export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}
