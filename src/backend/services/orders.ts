import pool from "../db/pool.js";

interface Order {
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

const VALID_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "shipped",
  "delivered",
  "cancelled",
];
const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
const VALID_SORT_FIELDS = [
  "id",
  "supplier_id",
  "product_id",
  "quantity",
  "unit_price",
  "total_price",
  "status",
  "priority",
  "created_at",
  "updated_at",
  "warehouse",
];

// In-memory patch locks
const patchLocks = new Set<string>();

export async function getOrders(options: ListOptions) {
  let limit = Math.min(options.limit || 20, 1000);
  if (limit < 0) limit = Math.min(Math.abs(limit), 100);
  const offset = Math.max(options.offset || 0, 0);

  let whereClause = "WHERE 1=1";
  const params: any[] = [];

  if (options.status) {
    const statuses = options.status.split(",").map((s) => s.trim());
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
    whereClause += ` AND o.created_at >= $${params.length + 1}`;
    params.push(options.date_from);
  }

  if (options.date_to) {
    whereClause += ` AND o.created_at <= $${params.length + 1}::date + interval '1 day'`;
    params.push(options.date_to);
  }

  if (options.min_total) {
    whereClause += ` AND o.total_price >= $${params.length + 1}`;
    params.push(options.min_total);
  }

  if (options.search) {
    whereClause += ` AND LOWER(p.name) LIKE LOWER($${params.length + 1})`;
    params.push(`%${options.search}%`);
  }

  // Get total count
  const countQuery = `SELECT COUNT(*) as count FROM orders o LEFT JOIN suppliers s ON o.supplier_id = s.id LEFT JOIN products p ON o.product_id = p.id ${whereClause}`;
  const countResult = await pool.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);

  // Build main query
  let query = `SELECT o.id, o.supplier_id, o.product_id, o.quantity, o.unit_price, o.total_price, 
                o.status, o.priority, o.created_at, o.updated_at, o.warehouse, o.notes, o.version,
                s.name as supplier_name, p.name as product_name
               FROM orders o
               LEFT JOIN suppliers s ON o.supplier_id = s.id
               LEFT JOIN products p ON o.product_id = p.id
               ${whereClause}`;

  // Sorting
  let sortField = "o.id";
  if (options.sort && VALID_SORT_FIELDS.includes(options.sort)) {
    sortField = `o.${options.sort}`;
  }
  const orderDir = options.order === "desc" ? "DESC" : "ASC";
  query += ` ORDER BY ${sortField} ${orderDir} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const queryParams = [...params, limit, offset];
  const result = await pool.query(query, queryParams);

  return {
    data: result.rows as Order[],
    total,
    limit,
    offset,
  };
}

export async function getOrderById(id: string): Promise<Order | null> {
  const result = await pool.query(
    `SELECT o.id, o.supplier_id, o.product_id, o.quantity, o.unit_price, o.total_price, 
            o.status, o.priority, o.created_at, o.updated_at, o.warehouse, o.notes, o.version,
            s.name as supplier_name, p.name as product_name
     FROM orders o
     LEFT JOIN suppliers s ON o.supplier_id = s.id
     LEFT JOIN products p ON o.product_id = p.id
     WHERE o.id = $1`,
    [id],
  );
  return result.rows[0] || null;
}

export async function patchOrder(
  id: string,
  updates: { status?: string; priority?: string; notes?: string },
): Promise<{ order: Order | null; error?: string }> {
  // Check if already locked
  if (patchLocks.has(id)) {
    return { order: null, error: "Order is being updated" };
  }

  patchLocks.add(id);

  try {
    // Get current order
    const current = await getOrderById(id);
    if (!current) {
      return { order: null, error: "Order not found" };
    }

    // Check if cancelled
    if (current.status === "cancelled") {
      return { order: null, error: "Order is cancelled" };
    }

    // Validate updates
    if (updates.status) {
      if (!VALID_STATUSES.includes(updates.status)) {
        return { order: null, error: "Invalid status" };
      }
    }
    if (updates.priority) {
      if (!VALID_PRIORITIES.includes(updates.priority)) {
        return { order: null, error: "Invalid priority" };
      }
    }

    // Update order
    const now = new Date().toISOString();
    const newStatus = updates.status || current.status;
    const newPriority = updates.priority || current.priority;
    const newNotes =
      updates.notes !== undefined ? updates.notes : current.notes;

    const result = await pool.query(
      `UPDATE orders 
       SET status = $1, priority = $2, notes = $3, version = version + 1, updated_at = $4
       WHERE id = $5
       RETURNING *`,
      [newStatus, newPriority, newNotes, now, id],
    );

    const updated = result.rows[0];

    // Emit SSE event if status changed
    if (updates.status && updates.status !== current.status) {
      return {
        order: {
          ...updated,
          supplier_name: current.supplier_name,
          product_name: current.product_name,
        },
        error: undefined,
      };
    }

    return {
      order: {
        ...updated,
        supplier_name: current.supplier_name,
        product_name: current.product_name,
      },
    };
  } finally {
    patchLocks.delete(id);
  }
}

export async function getOrderStats() {
  const result = await pool.query(`
    SELECT 
      COUNT(*) as total_orders,
      SUM(total_price) as total_revenue,
      AVG(total_price) as avg_order_value
    FROM orders
  `);
  const stats = result.rows[0];

  const byStatusResult = await pool.query(`
    SELECT status, COUNT(*) as count, SUM(total_price) as total_value
    FROM orders
    GROUP BY status
  `);
  const by_status: any = {};
  for (const row of byStatusResult.rows) {
    by_status[row.status] = {
      count: row.count,
      total_value: parseFloat(row.total_value),
    };
  }

  const byMonthResult = await pool.query(`
    SELECT 
      TO_CHAR(created_at, 'YYYY-MM') as month,
      COUNT(*) as order_count,
      SUM(total_price) as revenue
    FROM orders
    GROUP BY TO_CHAR(created_at, 'YYYY-MM')
    ORDER BY month
  `);
  const by_month = byMonthResult.rows.map((row) => ({
    month: row.month,
    order_count: row.order_count,
    revenue: parseFloat(row.revenue),
  }));

  const topSuppliersResult = await pool.query(`
    SELECT 
      o.supplier_id,
      s.name as supplier_name,
      SUM(o.total_price) as total_revenue
    FROM orders o
    LEFT JOIN suppliers s ON o.supplier_id = s.id
    GROUP BY o.supplier_id, s.name
    ORDER BY total_revenue DESC
    LIMIT 10
  `);
  const top_suppliers = topSuppliersResult.rows.map((row) => ({
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    total_revenue: parseFloat(row.total_revenue),
  }));

  const byWarehouseResult = await pool.query(`
    SELECT 
      COALESCE(warehouse, 'unassigned') as warehouse,
      COUNT(*) as count
    FROM orders
    GROUP BY COALESCE(warehouse, 'unassigned')
  `);
  const by_warehouse = byWarehouseResult.rows.map((row) => ({
    warehouse: row.warehouse,
    count: row.count,
  }));

  return {
    total_orders: parseInt(stats.total_orders),
    total_revenue: parseFloat(stats.total_revenue),
    avg_order_value: parseFloat(stats.avg_order_value),
    by_status,
    by_month,
    top_suppliers,
    by_warehouse,
  };
}
