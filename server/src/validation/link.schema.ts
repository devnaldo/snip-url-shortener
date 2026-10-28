import { z } from 'zod';
import { validateAlias } from '../lib/alias.js';
import { validateDestinationUrl } from '../lib/destination-url.js';

export const destinationUrlSchema = z
  .string('Destination URL is required')
  .trim()
  .superRefine((value, context) => {
    const result = validateDestinationUrl(value);

    if (!result.valid) {
      context.addIssue({ code: 'custom', message: result.message });
    }
  });

export const aliasSchema = z.string('Alias must be a string').superRefine((value, context) => {
  const result = validateAlias(value);

  if (!result.valid) {
    context.addIssue({ code: 'custom', message: result.message });
  }
});

const expiresAtSchema = z.iso
  .datetime({ offset: true, message: 'Expiry must be an ISO 8601 timestamp.' })
  .transform((value) => new Date(value))
  .refine((value) => value.getTime() > Date.now(), 'Expiry must be in the future.');

export const createLinkSchema = z.object({
  destinationUrl: destinationUrlSchema,
  alias: aliasSchema.optional(),
  expiresAt: expiresAtSchema.optional(),
});

export const updateLinkSchema = z
  .object({
    destinationUrl: destinationUrlSchema.optional(),
    expiresAt: expiresAtSchema.nullable().optional(),
    isActive: z.boolean('isActive must be a boolean').optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Provide at least one field to update.',
    path: ['_root'],
  });

export const listLinksQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1.').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1.')
    .max(100, 'Limit must be at most 100.')
    .default(20),
});

export const linkIdParamsSchema = z.object({
  id: z.uuid('Invalid link id.'),
});

export type CreateLinkInput = z.infer<typeof createLinkSchema>;
export type UpdateLinkInput = z.infer<typeof updateLinkSchema>;
export type ListLinksQuery = z.infer<typeof listLinksQuerySchema>;
export type LinkIdParams = z.infer<typeof linkIdParamsSchema>;
