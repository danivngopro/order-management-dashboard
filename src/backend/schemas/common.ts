import { z } from 'zod';
import { normalizeLimit, normalizeOffset } from '../config/constants.js';

export const idParamSchema = z.object({
  id: z.string().min(1),
});

export const paginationQuerySchema = z.object({
  limit: z.preprocess(
    (value) => firstQueryValue(value),
    z.coerce.number().int().optional().transform((value) => normalizeLimit(value))
  ),
  offset: z.preprocess(
    (value) => firstQueryValue(value),
    z.coerce.number().int().optional().transform((value) => normalizeOffset(value))
  ),
});

export function firstQueryValue(value: unknown): unknown {
  if (Array.isArray(value)) return value[0];
  if (value === '') return undefined;
  return value;
}

export const optionalQueryString = z.preprocess(
  (value) => firstQueryValue(value),
  z.string().trim().min(1).optional()
);

export const optionalQueryNumber = z.preprocess(
  (value) => firstQueryValue(value),
  z.coerce.number().optional()
);
