# Anomaly Strategy

## Overview

The anomaly endpoint scans procurement orders for data-quality and operational risk signals. Each returned record includes:

- `order_id`
- `anomaly_types`
- `severity`

An order can match multiple anomaly rules, so `anomaly_types` is returned as an array rather than a single value.

The import process preserves the original CSV data exactly. Suspicious records are not repaired, deleted, or normalized during import. Instead, anomalies are detected at query time so the API can surface the underlying data-quality issues transparently.

## Implemented Rules

### Required Rules

#### `price_mismatch`

Condition:

```text
abs(total_price - quantity * unit_price) > 0.01
```

This detects orders where the stored total does not match the expected calculated total.

#### `inactive_supplier`

Condition:

```text
supplier.active = false
```

This detects orders associated with suppliers that are currently marked inactive.

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
unit_price > product.price * PRICE_SPIKE_MULTIPLIER
```

The current multiplier is `3`.

This detects orders where the unit price is significantly higher than the product catalog price.

#### `after_hours`

Condition:

```text
created_at hour UTC >= AFTER_HOURS_START_UTC
or
created_at hour UTC < AFTER_HOURS_END_UTC
```

The current after-hours window is `22:00-06:00 UTC`.

This detects orders created outside normal business hours.

#### `risky_supplier`

Condition:

```text
supplier anomaly rate > RISKY_SUPPLIER_THRESHOLD
```

The current threshold is `50%`.

This detects suppliers with a high concentration of anomalous orders. Supplier-level risk is useful because a supplier with many suspicious records may deserve review even if each individual order is not severe on its own.

## Severity Logic

Severity is assigned based on the final set of anomaly types for each order.

### High

An order is marked `high` severity if it:

- includes `negative_quantity`
- includes `timestamp_anomaly`
- has 3 or more anomaly types

These cases are likely to represent invalid data or records that require immediate review.

### Medium

An order is marked `medium` severity if it includes one of:

- `price_mismatch`
- `inactive_supplier`
- `price_spike`
- `risky_supplier`

These are important financial or supplier-risk signals, but they may require business context before action.

### Low

An order is marked `low` severity if it only has lower-risk behavioral signals, such as `after_hours`.

After-hours activity is not necessarily wrong, but it is useful for monitoring and investigation.

## Configuration

Anomaly thresholds are centralized in backend configuration/constants rather than hardcoded inside route handlers.

This includes:

- price mismatch tolerance
- price spike multiplier
- after-hours UTC window
- risky supplier threshold

Keeping these values centralized makes the behavior easier to review and adjust without searching through route or service code.

## Data Patterns Observed

The dataset intentionally includes several quality issues and edge cases:

- mismatched order totals
- negative quantities
- orders from inactive suppliers
- impossible timestamps
- price spikes compared with product catalog price
- after-hours ordering patterns
- supplier-level clusters of anomalous orders

These patterns confirm that anomaly detection should support multiple simultaneous anomaly types per order rather than returning only the first matched rule.

## Implementation Approach

Anomaly detection is implemented primarily in SQL for performance and consistency.

The query joins:

- `orders`
- `suppliers`
- `products`
- supplier-level anomaly-rate calculations

This avoids N+1 application-level queries and avoids loading all orders into application memory for rule evaluation.

The implementation builds anomaly type arrays in the query and then assigns severity based on the final set of matched rules.

## Why the Data Is Not Repaired During Import

The CSV contains intentional edge cases. The import process therefore preserves the data exactly:

- bad totals are not recalculated
- negative quantities are not blocked
- impossible timestamps are not fixed
- inactive supplier orders are not removed
- XSS-like notes are stored as plain text

This allows the anomaly endpoint and documentation to explain what was found instead of silently hiding data-quality problems.

## Tradeoffs

Query-time anomaly detection keeps the result current and avoids adding extra persistence logic for the take-home assignment.

At a larger scale, the endpoint could become expensive if the rules become more complex or the dataset grows significantly. In that case, I would move toward persisted anomaly snapshots that are recomputed after imports, order updates, or scheduled background jobs.

## Future Improvements

With more time, I would add:

- persisted anomaly snapshots for faster dashboards
- scheduled anomaly recomputation after imports or bulk updates
- configurable thresholds per category, warehouse, and supplier
- more advanced price-spike detection using rolling baselines instead of a fixed multiplier
- anomaly explanations with exact numeric deltas
- analyst feedback to mark false positives
- severity scoring based on financial impact
- dashboard filters by anomaly type, supplier, warehouse, and severity
- alerting when a supplier crosses a risk threshold
