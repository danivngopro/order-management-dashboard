import { z } from 'zod';
import { paginationQuerySchema } from './common.js';

export const listSuppliersQuerySchema = paginationQuerySchema;

export type ListSuppliersQuery = z.infer<typeof listSuppliersQuerySchema>;
