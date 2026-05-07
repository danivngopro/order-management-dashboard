export const DATASET = {
  EXPECTED_ORDER_COUNT: Number(process.env.EXPECTED_ORDER_COUNT ?? 50000),
} as const;

export const PAGINATION = {
  DEFAULT_LIMIT: Number(process.env.DEFAULT_LIMIT ?? 20),
  NEGATIVE_LIMIT_MAX: Number(process.env.NEGATIVE_LIMIT_MAX ?? 100),
  MAX_LIMIT: Number(process.env.MAX_LIMIT ?? 1000),
  DEFAULT_OFFSET: Number(process.env.DEFAULT_OFFSET ?? 0),
} as const;

export const IMPORT = {
  CHUNK_SIZE: Number(process.env.IMPORT_CHUNK_SIZE ?? 500),
} as const;

export const BULK = {
  MAX_IDS: Number(process.env.MAX_BULK_IDS ?? 10000),
  PROCESS_BATCH_SIZE: Number(process.env.BULK_PROCESS_BATCH_SIZE ?? 250),
} as const;

export const ANOMALY = {
  PRICE_MISMATCH_TOLERANCE: Number(process.env.PRICE_MISMATCH_TOLERANCE ?? 0.01),
  PRICE_SPIKE_MULTIPLIER: Number(process.env.PRICE_SPIKE_MULTIPLIER ?? 3),
  AFTER_HOURS_START_UTC: Number(process.env.AFTER_HOURS_START_UTC ?? 22),
  AFTER_HOURS_END_UTC: Number(process.env.AFTER_HOURS_END_UTC ?? 6),
  RISKY_SUPPLIER_THRESHOLD: Number(process.env.RISKY_SUPPLIER_THRESHOLD ?? 0.5),
} as const;

export const SUPPLIER_PERFORMANCE = {
  PRICE_CONSISTENCY_LOWER_MULTIPLIER: Number(process.env.PRICE_CONSISTENCY_LOWER_MULTIPLIER ?? 0.8),
  PRICE_CONSISTENCY_UPPER_MULTIPLIER: Number(process.env.PRICE_CONSISTENCY_UPPER_MULTIPLIER ?? 1.2),
} as const;

export const AGGREGATION = {
  TOP_SUPPLIERS_LIMIT: Number(process.env.TOP_SUPPLIERS_LIMIT ?? 10),
} as const;

export const TIME = {
  SECONDS_PER_DAY: Number(process.env.SECONDS_PER_DAY ?? 86400),
} as const;

export function normalizeLimit(value?: number): number {
  if (!Number.isFinite(value as number) || value === undefined) return PAGINATION.DEFAULT_LIMIT;
  if (value < 0) return Math.min(Math.abs(value), PAGINATION.NEGATIVE_LIMIT_MAX);
  return Math.min(value, PAGINATION.MAX_LIMIT);
}

export function normalizeOffset(value?: number): number {
  if (!Number.isFinite(value as number) || value === undefined) return PAGINATION.DEFAULT_OFFSET;
  return Math.max(value, PAGINATION.DEFAULT_OFFSET);
}
