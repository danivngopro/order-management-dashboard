import pool from "../db/pool.js";

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

export async function getSuppliers(options: ListOptions) {
  let limit = Math.min(options.limit || 20, 1000);
  const offset = Math.max(options.offset || 0, 0);

  const countResult = await pool.query(
    "SELECT COUNT(*) as count FROM suppliers",
  );
  const total = parseInt(countResult.rows[0].count);

  const result = await pool.query(
    "SELECT * FROM suppliers ORDER BY id LIMIT $1 OFFSET $2",
    [limit, offset],
  );

  return {
    data: result.rows as Supplier[],
    total,
    limit,
    offset,
  };
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  const result = await pool.query("SELECT * FROM suppliers WHERE id = $1", [
    id,
  ]);
  const supplier = result.rows[0];

  if (!supplier) return null;

  // Get order count and total revenue
  const statsResult = await pool.query(
    `SELECT COUNT(*) as order_count, SUM(total_price) as total_revenue 
     FROM orders WHERE supplier_id = $1`,
    [id],
  );

  const stats = statsResult.rows[0];
  supplier.order_count = parseInt(stats.order_count);
  supplier.total_revenue = stats.total_revenue
    ? parseFloat(stats.total_revenue)
    : 0;

  return supplier;
}

export async function getSupplierPerformance(id: string) {
  // Get all orders for this supplier
  const ordersResult = await pool.query(
    `SELECT o.*, p.price as product_price 
     FROM orders o
     LEFT JOIN products p ON o.product_id = p.id
     WHERE o.supplier_id = $1
     ORDER BY o.created_at`,
    [id],
  );

  const orders = ordersResult.rows;

  if (orders.length === 0) {
    return {
      avg_delivery_days: 0,
      rejection_rate: 0,
      avg_order_value: 0,
      monthly_trend: [],
      price_consistency: 0,
    };
  }

  // avg_delivery_days: delivered orders only, avg(updated_at - created_at) in days
  const deliveredOrders = orders.filter((o) => o.status === "delivered");
  let avg_delivery_days = 0;
  if (deliveredOrders.length > 0) {
    const totalDays = deliveredOrders.reduce((sum, o) => {
      const created = new Date(o.created_at).getTime();
      const updated = new Date(o.updated_at).getTime();
      return sum + (updated - created) / (1000 * 60 * 60 * 24);
    }, 0);
    avg_delivery_days = totalDays / deliveredOrders.length;
  }

  // rejection_rate: rejected count / total supplier orders
  const rejectedCount = orders.filter((o) => o.status === "rejected").length;
  const rejection_rate = orders.length > 0 ? rejectedCount / orders.length : 0;

  // avg_order_value: avg(total_price)
  const total_revenue = orders.reduce(
    (sum, o) => sum + parseFloat(o.total_price),
    0,
  );
  const avg_order_value = orders.length > 0 ? total_revenue / orders.length : 0;

  // monthly_trend: group supplier orders by YYYY-MM
  const monthlyMap = new Map<
    string,
    { order_count: number; revenue: number }
  >();
  for (const order of orders) {
    const month = new Date(order.created_at).toISOString().substring(0, 7);
    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, { order_count: 0, revenue: 0 });
    }
    const m = monthlyMap.get(month)!;
    m.order_count++;
    m.revenue += parseFloat(order.total_price);
  }
  const monthly_trend = Array.from(monthlyMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, data]) => ({ month, ...data }));

  // price_consistency: fraction of supplier orders where unit_price is within 20% of products.price
  let consistentCount = 0;
  for (const order of orders) {
    if (
      order.product_price &&
      order.unit_price >= order.product_price * 0.8 &&
      order.unit_price <= order.product_price * 1.2
    ) {
      consistentCount++;
    }
  }
  const price_consistency =
    orders.length > 0 ? consistentCount / orders.length : 0;

  return {
    avg_delivery_days,
    rejection_rate,
    avg_order_value,
    monthly_trend,
    price_consistency,
  };
}
