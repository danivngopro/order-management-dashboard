import pool from '../db/pool.js';

interface Supplier {
  id: string;
  name: string;
  email?: string;
  rating?: number;
  country?: string;
  active: boolean;
  created_at?: string;
  order_count?: number;
  total_revenue?: number;
}

interface ListOptions {
  limit?: number;
  offset?: number;
}

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value as number) || value === undefined) return 20;
  if (value < 0) return Math.min(Math.abs(value), 100);
  return Math.min(value, 1000);
}

export async function getSuppliers(options: ListOptions) {
  const limit = normalizeLimit(options.limit);
  const offset = Math.max(options.offset || 0, 0);

  const countResult = await pool.query('SELECT COUNT(*)::int as count FROM suppliers');
  const total = Number(countResult.rows[0].count);

  const result = await pool.query(
    'SELECT id, name, email, rating::float8 AS rating, country, active, created_at FROM suppliers ORDER BY id LIMIT $1 OFFSET $2',
    [limit, offset]
  );

  return { data: result.rows as Supplier[], total, limit, offset };
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const result = await pool.query(
    'SELECT id, name, email, rating::float8 AS rating, country, active, created_at FROM suppliers WHERE id = $1',
    [id]
  );
  const supplier = result.rows[0];
  if (!supplier) return null;

  const statsResult = await pool.query(
    `SELECT COUNT(*)::int as order_count, COALESCE(SUM(total_price), 0)::float8 as total_revenue
     FROM orders WHERE supplier_id = $1`,
    [id]
  );

  supplier.order_count = Number(statsResult.rows[0].order_count);
  supplier.total_revenue = Number(statsResult.rows[0].total_revenue);
  return supplier;
}

export async function getSupplierPerformance(id: string) {
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS total_orders,
       COALESCE(AVG(total_price), 0)::float8 AS avg_order_value,
       COALESCE(SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END), 0)::float8 / NULLIF(COUNT(*), 0) AS rejection_rate,
       COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) FILTER (WHERE status = 'delivered'), 0)::float8 AS avg_delivery_days,
       COALESCE(SUM(CASE WHEN p.price IS NOT NULL AND o.unit_price BETWEEN p.price * 0.8 AND p.price * 1.2 THEN 1 ELSE 0 END), 0)::float8 / NULLIF(COUNT(*), 0) AS price_consistency
     FROM orders o
     LEFT JOIN products p ON o.product_id = p.id
     WHERE o.supplier_id = $1`,
    [id]
  );

  const trendResult = await pool.query(
    `SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
            COUNT(*)::int AS order_count
     FROM orders
     WHERE supplier_id = $1
     GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM')
     ORDER BY month`,
    [id]
  );

  const row = result.rows[0];
  return {
    avg_delivery_days: Number(row.avg_delivery_days || 0),
    rejection_rate: Number(row.rejection_rate || 0),
    avg_order_value: Number(row.avg_order_value || 0),
    monthly_trend: trendResult.rows.map((r) => ({ month: r.month, order_count: Number(r.order_count) })),
    price_consistency: Number(row.price_consistency || 0),
  };
}
