import { z } from 'zod';
import { ANALYTICS_RANGES } from '../lib/analytics-window.js';

export const analyticsQuerySchema = z.object({
  range: z.enum(ANALYTICS_RANGES).default('7d'),
});

export type AnalyticsQuery = z.infer<typeof analyticsQuerySchema>;
