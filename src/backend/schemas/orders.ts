import { z } from 'zod';
import { BULK } from '../config/constants.js';
import {
  BULK_ACTIONS,
  ORDER_PRIORITIES,
  ORDER_SORT_FIELDS,
  ORDER_STATUSES,
  SORT_ORDERS,
} from '../config/domain.js';
import { firstQueryValue, optionalQueryNumber, optionalQueryString, paginationQuerySchema } from './common.js';

const commaSeparatedStatusesSchema = z.preprocess(
  (value) => firstQueryValue(value),
  z.string()
    .trim()
    .min(1)
    .optional()
    .refine((value) => {
      if (!value) return true;
      const statuses = value.split(',').map((status) => status.trim()).filter(Boolean);
      return statuses.length > 0 && statuses.every((status) => ORDER_STATUSES.includes(status as any));
    }, 'Invalid status')
);

export const listOrdersQuerySchema = paginationQuerySchema.extend({
  status: commaSeparatedStatusesSchema,
  priority: z.preprocess((value) => firstQueryValue(value), z.enum(ORDER_PRIORITIES).optional()),
  supplier_id: optionalQueryString,
  warehouse: optionalQueryString,
  date_from: optionalQueryString,
  date_to: optionalQueryString,
  min_total: optionalQueryNumber,
  search: optionalQueryString,
  sort: z.preprocess((value) => firstQueryValue(value), z.enum(ORDER_SORT_FIELDS).optional()),
  order: z.preprocess((value) => {
    const parsed = firstQueryValue(value);
    return typeof parsed === 'string' ? parsed.toLowerCase() : parsed;
  }, z.enum(SORT_ORDERS).optional()),
});

export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

export const patchOrderBodySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  priority: z.enum(ORDER_PRIORITIES).optional(),
  notes: z.string().nullable().optional(),
});

export type PatchOrderBody = z.infer<typeof patchOrderBodySchema>;

export const bulkActionBodySchema = z.object({
  orderIds: z.array(z.string()).min(1).max(BULK.MAX_IDS),
  action: z.enum(BULK_ACTIONS),
  reason: z.string().optional(),
});

export type BulkActionBody = z.infer<typeof bulkActionBodySchema>;

export const bulkActionsBodySchema = z.object({
  order_ids: z.array(z.string()).min(1).max(BULK.MAX_IDS),
  action: z.enum(BULK_ACTIONS),
  reason: z.string().optional(),
});

export type BulkActionsBody = z.infer<typeof bulkActionsBodySchema>;
