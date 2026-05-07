import pool from '../db/pool.js';
import { ANOMALY } from '../config/constants.js';
import { AnomalySeverity, AnomalyType } from '../config/domain.js';

interface Anomaly {
  order_id: string;
  anomaly_types: AnomalyType[];
  severity: AnomalySeverity;
}

function determineSeverity(types: AnomalyType[]): AnomalySeverity {
  if (types.includes('negative_quantity') || types.includes('timestamp_anomaly') || types.length >= 3) {
    return 'high';
  }

  if (
    types.includes('price_mismatch') ||
    types.includes('inactive_supplier') ||
    types.includes('price_spike') ||
    types.includes('risky_supplier')
  ) {
    return 'medium';
  }

  return 'low';
}

export async function getAnomalies(): Promise<Anomaly[]> {
  const result = await pool.query(
    `WITH base AS (
      SELECT
        o.id AS order_id,
        o.supplier_id,
        ARRAY_REMOVE(ARRAY[
          CASE WHEN ABS(o.total_price - (o.quantity * o.unit_price)) > $1 THEN 'price_mismatch' END,
          CASE WHEN s.active = false THEN 'inactive_supplier' END,
          CASE WHEN o.quantity < 0 THEN 'negative_quantity' END,
          CASE WHEN o.updated_at < o.created_at THEN 'timestamp_anomaly' END,
          CASE WHEN p.price IS NOT NULL AND o.unit_price > $2 * p.price THEN 'price_spike' END,
          CASE WHEN EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'UTC') >= $3
                  OR EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'UTC') < $4 THEN 'after_hours' END
        ], NULL) AS initial_types
      FROM orders o
      LEFT JOIN suppliers s ON o.supplier_id = s.id
      LEFT JOIN products p ON o.product_id = p.id
    ), supplier_risk AS (
      SELECT supplier_id
      FROM base
      GROUP BY supplier_id
      HAVING COUNT(*) FILTER (WHERE array_length(initial_types, 1) > 0)::float8 / COUNT(*) > $5
    ), final AS (
      SELECT
        b.order_id,
        CASE
          WHEN sr.supplier_id IS NOT NULL AND array_length(b.initial_types, 1) > 0 THEN b.initial_types || ARRAY['risky_supplier']::text[]
          WHEN sr.supplier_id IS NOT NULL THEN ARRAY['risky_supplier']::text[]
          ELSE b.initial_types
        END AS anomaly_types
      FROM base b
      LEFT JOIN supplier_risk sr ON b.supplier_id = sr.supplier_id
    )
    SELECT order_id, anomaly_types
    FROM final
    WHERE array_length(anomaly_types, 1) > 0
    ORDER BY order_id`,
    [
      ANOMALY.PRICE_MISMATCH_TOLERANCE,
      ANOMALY.PRICE_SPIKE_MULTIPLIER,
      ANOMALY.AFTER_HOURS_START_UTC,
      ANOMALY.AFTER_HOURS_END_UTC,
      ANOMALY.RISKY_SUPPLIER_THRESHOLD,
    ]
  );

  return result.rows.map((row) => {
    const types = row.anomaly_types as AnomalyType[];
    return {
      order_id: row.order_id,
      anomaly_types: types,
      severity: determineSeverity(types),
    };
  });
}
