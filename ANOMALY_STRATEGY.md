# Anomaly Strategy

## Implemented Rules

The anomaly endpoint scans orders and returns records with one or more anomaly types.

Required rules:

- `price_mismatch`: `abs(total_price - quantity * unit_price) > 0.01`
- `inactive_supplier`: the order belongs to a supplier where `active = false`
- `negative_quantity`: `quantity < 0`
- `timestamp_anomaly`: `updated_at < created_at`

Bonus rules:

- `price_spike`: `unit_price > 3 * product.price`
- `after_hours`: order was created outside normal UTC business hours, defined as `22:00-06:00`
- `risky_supplier`: supplier has more than 50% anomalous orders

## Severity Logic

Severity is assigned as follows:

- `high`: includes `negative_quantity`, includes `timestamp_anomaly`, or has 3+ anomaly types
- `medium`: includes `price_mismatch`, `inactive_supplier`, `price_spike`, or `risky_supplier`
- `low`: only lower-risk behavioral signals, such as `after_hours`

This keeps obviously invalid data high priority, while allowing operational warnings to remain medium or low.

## Data Patterns

The dataset intentionally includes several quality issues:

- mismatched order totals
- negative quantities that may represent returns
- orders from inactive suppliers
- impossible timestamps
- price spikes against catalog price
- after-hours ordering patterns
- supplier-level concentrations of anomalous orders

The implementation preserves the original data during import and detects these issues at query time.

## Future Improvements

With more time, I would add:

- persisted anomaly snapshots for faster dashboards
- configurable thresholds per category/supplier
- rolling historical baselines for price spikes
- anomaly explanations with exact numeric deltas
- analyst feedback to mark false positives
- queue-based background anomaly recomputation after imports
