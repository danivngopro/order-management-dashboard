import pool from '../db/pool.js';

export interface Order {
  id: string;
  supplier_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  warehouse: string | null;
  notes: string | null;
  supplier_name?: string;
  product_name?: string;
  version: number;
}

interface ListOptions {
  limit?: number;
  offset?: number;
  status?: string;
  priority?: string;
  supplier_id?: string;
  warehouse?: string;
  date_from?: string;
  date_to?: string;
  min_total?: number;
  search?: string;
  sort?: string;
  order?: string;
}

export const VALID_STATUSES = ['pending', 'approved', 'rejected', 'shipped', 'delivered', 'cancelled'];
export const VALID_PRIORITIES = ['low', 'medium', 'high', 'critical'];
const VALID_SORT_FIELDS = ['id', 'supplier_id', 'product_id', 'quantity', 'unit_price', 'total_price', 'status', 'priority', 'created_at', 'updated_at', 'warehouse'];
const patchLocks = new Set<string>();

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value as number) || value === undefined) return 20;
  if (value < 0) return Math.min(Math.abs(value), 100);
  return Math.min(value, 1000);
}

function normalizeOffset(value?: number) {
  if (!Number.isFinite(value as number) || value === undefined) return 0;
  return Math.max(value, 0);
}

const orderSelect = `
  SELECT
    o.id,
    o.supplier_id,
    o.product_id,
    o.quantity::int AS quantity,
    o.unit_price::float8 AS unit_price,
    o.total_price::float8 AS total_price,
    o.status,
    o.priority,
    o.created_at,
    o.updated_at,
    o.warehouse,
    o.notes,
    o.version::int AS version,
    s.name AS supplier_name,
    p.name AS product_name
  FROM orders o
  LEFT JOIN suppliers s ON o.supplier_id = s.id
  LEFT JOIN products p ON o.product_id = p.id
`;

export async function getOrders(options: ListOptions) {
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);

  let whereClause = 'WHERE 1=1';
  const params: any[] = [];

  if (options.status) {
    const statuses = options.status.split(',').map((s) => s.trim()).filter(Boolean);
    whereClause += ` AND o.status = ANY($${params.length + 1})`;
    params.push(statuses);
  }

  if (options.priority) {
    whereClause += ` AND o.priority = $${params.length + 1}`;
    params.push(options.priority);
  }

  if (options.supplier_id) {
    whereClause += ` AND o.supplier_id = $${params.length + 1}`;
    params.push(options.supplier_id);
  }

  if (options.warehouse) {
    whereClause += ` AND o.warehouse = $${params.length + 1}`;
    params.push(options.warehouse);
  }

  if (options.date_from) {
    whereClause += ` AND o.created_at >= $${params.length + 1}::timestamptz`;
    params.push(`${options.date_from}T00:00:00Z`);
  }

  if (options.date_to) {
    whereClause += ` AND o.created_at <= $${params.length + 1}::timestamptz`;
    params.push(`${options.date_to}T23:59:59.999Z`);
  }

  if (options.min_total !== undefined && Number.isFinite(options.min_total)) {
    whereClause += ` AND o.total_price >= $${params.length + 1}`;
    params.push(options.min_total);
  }

  if (options.search) {
    whereClause += ` AND LOWER(p.name) LIKE LOWER($${params.length + 1})`;
    params.push(`%${options.search}%`);
  }

  const countQuery = `SELECT COUNT(*)::int as count FROM orders o LEFT JOIN products p ON o.product_id = p.id ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = Number(countResult.rows[0].count);

  let sortField = 'o.id';
  if (options.sort && VALID_SORT_FIELDS.includes(options.sort)) {
    sortField = `o.${options.sort}`;
  }
  const orderDir = options.order?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const query = `${orderSelect} ${whereClause} ORDER BY ${sortField} ${orderDir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  const result = await pool.query(query, [...params, limit, offset]);

  return { data: result.rows as Order[], total, limit, offset };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const result = await pool.query(`${orderSelect} WHERE o.id = $1`, [id]);
  return result.rows[0] || null;
}

export async function patchOrder(
  id: string,
  updates: { status?: string; priority?: string; notes?: string }
): Promise<{ order: Order | null; error?: string; oldStatus?: string }> {
  if (patchLocks.has(id)) {
    return { order: null, error: 'Order is being updated' };
  }

  patchLocks.add(id);
  try {
    const current = await getOrderById(id);
    if (!current) return { order: null, error: 'Order not found' };
    if (current.status === 'cancelled') return { order: null, error: 'Order is cancelled' };

    if (updates.status && !VALID_STATUSES.includes(updates.status)) return { order: null, error: 'Invalid status' };
    if (updates.priority && !VALID_PRIORITIES.includes(updates.priority)) return { order: null, error: 'Invalid priority' };

    const newStatus = updates.status ?? current.status;
    const newPriority = updates.priority ?? current.priority;
    const newNotes = updates.notes !== undefined ? updates.notes : current.notes;

    const result = await pool.query(
      `UPDATE orders
       SET status = $1,
           priority = $2,
           notes = $3,
           version = version + 1,
           updated_at = now()
       WHERE id = $4
       RETURNING
         id, supplier_id, product_id, quantity::int AS quantity,
         unit_price::float8 AS unit_price, total_price::float8 AS total_price,
         status, priority, created_at, updated_at, warehouse, notes, version::int AS version`,
      [newStatus, newPriority, newNotes, id]
    );

    const updated = {
      ...result.rows[0],
      supplier_name: current.supplier_name,
      product_name: current.product_name,
    } as Order;

    return { order: updated, oldStatus: current.status };
  } finally {
    patchLocks.delete(id);
  }
}

export async function getOrderStats() {
  const statsResult = await pool.query(`
    SELECT
      COUNT(*)::int AS total_orders,
      COALESCE(SUM(total_price), 0)::float8 AS total_revenue,
      COALESCE(AVG(total_price), 0)::float8 AS avg_order_value
    FROM orders
  `);
  const stats = statsResult.rows[0];

  const byStatusResult = await pool.query(`
    SELECT status, COUNT(*)::int AS count, COALESCE(SUM(total_price), 0)::float8 AS total_value
    FROM orders
    GROUP BY status
  `);
  const by_status: Record<string, { count: number; total_value: number }> = {};
  for (const row of byStatusResult.rows) {
    by_status[row.status] = { count: Number(row.count), total_value: Number(row.total_value) };
  }

  const byMonthResult = await pool.query(`
    SELECT TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM') AS month,
           COUNT(*)::int AS order_count,
           COALESCE(SUM(total_price), 0)::float8 AS revenue
    FROM orders
    GROUP BY TO_CHAR(created_at AT TIME ZONE 'UTC', 'YYYY-MM')
    ORDER BY month
  `);
  const by_month = byMonthResult.rows.map((row) => ({
    month: row.month,
    order_count: Number(row.order_count),
    revenue: Number(row.revenue),
  }));

  const topSuppliersResult = await pool.query(`
    SELECT o.supplier_id,
           s.name AS supplier_name,
           COALESCE(SUM(o.total_price), 0)::float8 AS total_revenue
    FROM orders o
    LEFT JOIN suppliers s ON o.supplier_id = s.id
    GROUP BY o.supplier_id, s.name
    ORDER BY total_revenue DESC
    LIMIT 10
  `);
  const top_suppliers = topSuppliersResult.rows.map((row) => ({
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    total_revenue: Number(row.total_revenue),
  }));

  const byWarehouseResult = await pool.query(`
    SELECT COALESCE(NULLIF(warehouse, ''), 'unassigned') AS warehouse,
           COUNT(*)::int AS count,
           COALESCE(SUM(total_price), 0)::float8 AS total_value
    FROM orders
    GROUP BY COALESCE(NULLIF(warehouse, ''), 'unassigned')
  `);
  const by_warehouse = byWarehouseResult.rows.map((row) => ({
    warehouse: row.warehouse,
    count: Number(row.count),
    total_value: Number(row.total_value),
  }));

  return {
    total_orders: Number(stats.total_orders),
    total_revenue: Number(stats.total_revenue),
    avg_order_value: Number(stats.avg_order_value),
    by_status,
    by_month,
    top_suppliers,
    by_warehouse,
  };
}
