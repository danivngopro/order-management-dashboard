import pool from "../db/pool.js";

interface Anomaly {
  order_id: string;
  anomaly_types: string[];
  severity: "low" | "medium" | "high";
}

export async function getAnomalies(): Promise<Anomaly[]> {
  // Get all orders with supplier and product info
  const result = await pool.query(`
    SELECT 
      o.id, o.quantity, o.unit_price, o.total_price, 
      o.status, o.created_at, o.updated_at, o.supplier_id,
      s.active as supplier_active,
      p.price as product_price
    FROM orders o
    LEFT JOIN suppliers s ON o.supplier_id = s.id
    LEFT JOIN products p ON o.product_id = p.id
  `);

  const anomalies: Anomaly[] = [];

  for (const order of result.rows) {
    const types: string[] = [];

    // price_mismatch: abs(total_price - quantity * unit_price) > 0.01
    if (
      Math.abs(order.total_price - order.quantity * order.unit_price) > 0.01
    ) {
      types.push("price_mismatch");
    }

    // inactive_supplier: supplier.active = false
    if (order.supplier_active === false) {
      types.push("inactive_supplier");
    }

    // negative_quantity: quantity < 0
    if (order.quantity < 0) {
      types.push("negative_quantity");
    }

    // timestamp_anomaly: updated_at < created_at
    if (new Date(order.updated_at) < new Date(order.created_at)) {
      types.push("timestamp_anomaly");
    }

    // price_spike: unit_price > 3 * product.price
    if (order.product_price && order.unit_price > 3 * order.product_price) {
      types.push("price_spike");
    }

    // after_hours: created_at UTC hour >= 22 or < 6
    const hour = new Date(order.created_at).getUTCHours();
    if (hour >= 22 || hour < 6) {
      types.push("after_hours");
    }

    // Only include if there are anomalies
    if (types.length > 0) {
      let severity: "low" | "medium" | "high" = "low";

      // high: negative_quantity, timestamp_anomaly, or 3+ anomaly types
      if (
        types.includes("negative_quantity") ||
        types.includes("timestamp_anomaly") ||
        types.length >= 3
      ) {
        severity = "high";
      }
      // medium: price_mismatch, inactive_supplier, price_spike, or risky_supplier
      else if (
        types.includes("price_mismatch") ||
        types.includes("inactive_supplier") ||
        types.includes("price_spike")
      ) {
        severity = "medium";
      }

      anomalies.push({
        order_id: order.id,
        anomaly_types: types,
        severity,
      });
    }
  }

  // Add risky_supplier detection: suppliers with >50% anomalous orders
  // Get supplier order counts and anomaly counts
  const supplierAnomalyStats = await pool.query(`
    SELECT o.supplier_id, COUNT(*) as total_orders
    FROM orders o
    GROUP BY o.supplier_id
  `);

  const suppliersWithRisk = new Set<string>();
  for (const stat of supplierAnomalyStats.rows) {
    const supplierAnomalies = anomalies.filter((a) => {
      const order = result.rows.find((r) => r.id === a.order_id);
      return order && order.supplier_id === stat.supplier_id;
    });
    const riskRatio = supplierAnomalies.length / stat.total_orders;
    if (riskRatio > 0.5) {
      suppliersWithRisk.add(stat.supplier_id);
    }
  }

  // Add risky_supplier to anomalies and recalculate severity
  for (const anomaly of anomalies) {
    const order = result.rows.find((r) => r.id === anomaly.order_id);
    if (order && suppliersWithRisk.has(order.supplier_id)) {
      if (!anomaly.anomaly_types.includes("risky_supplier")) {
        anomaly.anomaly_types.push("risky_supplier");

        // Recalculate severity with risky_supplier
        if (
          anomaly.anomaly_types.includes("negative_quantity") ||
          anomaly.anomaly_types.includes("timestamp_anomaly") ||
          anomaly.anomaly_types.length >= 3
        ) {
          anomaly.severity = "high";
        } else if (
          anomaly.anomaly_types.includes("price_mismatch") ||
          anomaly.anomaly_types.includes("inactive_supplier") ||
          anomaly.anomaly_types.includes("price_spike") ||
          anomaly.anomaly_types.includes("risky_supplier")
        ) {
          anomaly.severity = "medium";
        }
      }
    }
  }

  return anomalies;
}
