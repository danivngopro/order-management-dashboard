export const ORDER_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'shipped',
  'delivered',
  'cancelled',
] as const;

export type OrderStatus = typeof ORDER_STATUSES[number];

export const ORDER_PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

export type OrderPriority = typeof ORDER_PRIORITIES[number];

export const ORDER_SORT_FIELDS = [
  'id',
  'supplier_id',
  'product_id',
  'quantity',
  'unit_price',
  'total_price',
  'status',
  'priority',
  'created_at',
  'updated_at',
  'warehouse',
] as const;

export type OrderSortField = typeof ORDER_SORT_FIELDS[number];

export const SORT_ORDERS = ['asc', 'desc'] as const;
export type SortOrder = typeof SORT_ORDERS[number];

export const BULK_ACTIONS = ['approve', 'reject', 'flag'] as const;
export type BulkAction = typeof BULK_ACTIONS[number];

export const ANOMALY_TYPES = [
  'price_mismatch',
  'inactive_supplier',
  'negative_quantity',
  'timestamp_anomaly',
  'price_spike',
  'after_hours',
  'risky_supplier',
] as const;

export type AnomalyType = typeof ANOMALY_TYPES[number];
export type AnomalySeverity = 'low' | 'medium' | 'high';
