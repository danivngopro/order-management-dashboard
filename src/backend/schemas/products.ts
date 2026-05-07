import { z } from 'zod';
import { optionalQueryString, paginationQuerySchema } from './common.js';

export const listProductsQuerySchema = paginationQuerySchema.extend({
  category: optionalQueryString,
});

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
