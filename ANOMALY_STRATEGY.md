# Anomaly Strategy

## Overview

The anomaly endpoint scans procurement orders for data-quality and operational risk signals. Each returned record includes:

- `order_id`
- `anomaly_types`
- `severity`

An order can have multiple anomaly types.

The implementation preserves the original CSV data during import and detects anomalies at query time instead of repairing or deleting suspicious records.

## Implemented Rules

### Required Rules

#### `price_mismatch`

Condition:

```text
abs(total_price - quantity * unit_price) > 0.01
```

This detects orders where the stored total does not match the expected calculation.

#### `inactive_supplier`

Condition:

```text
supplier.active = false
```

This detects orders placed with suppliers that are marked inactive.

#### `negative_quantity`

Condition:

```text
quantity < 0
```

Negative quantities may represent returns, corrections, or reversed procurement records. They are preserved in the database and flagged instead of rejected.

#### `timestamp_anomaly`

Condition:

```text
updated_at < created_at
```

This detects impossible order timelines where an order appears to have been updated before it was created.

### Bonus Rules

#### `price_spike`

Condition:

```text
unit_price > 3 * product.price
```

This detects orders where the unit price is significantly higher than the product catalog price.

#### `after_hours`

Condition:

```text
created_at hour UTC >= 22 or < 6
```

This detects orders created outside normal business hours.

#### `risky_supplier`

Condition:

```text
supplier has more than 50% anomalous orders
```

This detects suppliers with a high concentration of anomalous orders. Supplier-level risk is useful because a supplier with many suspicious records may deserve review even if each individual order is not severe on its own.

## Severity Logic

Severity is assigned using the anomaly types on each order.

### High

An order is marked `high` severity if it:

- includes `negative_quantity`
- includes `timestamp_anomaly`
- has 3 or more anomaly types

These cases are likely to represent invalid data or records requiring immediate review.

### Medium

An order is marked `medium` severity if it includes one of:

- `price_mismatch`
- `inactive_supplier`
- `price_spike`
- `risky_supplier`

These are important financial or supplier-risk signals, but may require business context before action.

### Low

An order is marked `low` severity if it only has lower-risk behavioral signals, such as `after_hours`.

After-hours activity is not necessarily wrong, but it may be useful for monitoring.

## Data Patterns Observed

The dataset intentionally includes several quality issues and edge cases:

- mismatched order totals
- negative quantities
- orders from inactive suppliers
- impossible timestamps
- price spikes compared with product catalog price
- after-hours ordering patterns
- supplier-level clusters of anomalous orders

Approximate observed patterns include:

- hundreds of negative-quantity records
- hundreds of timestamp anomalies
- thousands of orders from inactive suppliers
- many after-hours orders because the dataset spans many timestamps
- supplier-level anomaly concentrations that trigger `risky_supplier`

These patterns confirm that anomaly detection should support multiple simultaneous anomaly types per order rather than returning only the first matched rule.

## Implementation Approach

The anomaly detection is implemented mostly in SQL for performance.

The query joins:

- `orders`
- `suppliers`
- `products`
- supplier-level anomaly-rate calculations

This avoids N+1 application-level loops and keeps the endpoint fast enough for the performance tests.

The implementation builds anomaly type arrays and then assigns severity based on the final set of matched rules.

## Why the Data Is Not Repaired During Import

The CSV contains intentional edge cases. The import process therefore preserves the data exactly:

- bad totals are not recalculated
- negative quantities are not blocked
- impossible timestamps are not fixed
- inactive supplier orders are not removed
- XSS-like notes are stored as plain text

This allows the anomaly endpoint and documentation to explain what was found instead of silently hiding data-quality problems.

## Future Improvements

With more time, I would add:

- persisted anomaly snapshots for faster dashboards
- scheduled anomaly recomputation after imports or bulk updates
- configurable thresholds per category, warehouse, and supplier
- more advanced price-spike detection using rolling baselines instead of a fixed `3x` threshold
- anomaly explanations with exact numeric deltas
- analyst feedback to mark false positives
- severity scoring based on financial impact
- dashboard filters by anomaly type, supplier, warehouse, and severity
- alerting when a supplier crosses a risk threshold
