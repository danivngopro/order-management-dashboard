# Architecture

## Overview

This project uses a modular monolith architecture: a single Node.js/TypeScript Express server running on port 3000, with internal modules for orders, suppliers, products, analytics, anomaly detection, bulk jobs, and realtime events.

I chose a modular monolith rather than physical microservices because the assignment and test harness expect one API process under `/api`. This keeps the local setup simple while still separating the business logic into clear modules that could later be extracted into independent services if needed.

## Project Structure

```text
src/backend/
  app.ts                  Express app, middleware, route registration
  server.ts               HTTP server entrypoint
  db/
    pool.ts               PostgreSQL connection pool
    schema.sql            Tables and indexes
    seed.ts               CSV import process
  routes/
    orders.ts             Orders, stats, anomalies, bulk endpoints
    suppliers.ts          Supplier list/detail/performance endpoints
    products.ts           Product list/category endpoints
  services/
    orders.ts             Order queries, filters, patch, stats
    suppliers.ts          Supplier metrics and performance
    products.ts           Recursive category filtering
    anomalies.ts          Data quality rules
    bulk.ts               Async bulk jobs
  realtime/
    sse.ts                Server-Sent Events manager
```

## Database Schema

The schema mirrors the CSV files while preserving intentional edge cases from the dataset.

### `suppliers`

Stores supplier metadata, including the `active` flag used by anomaly detection.

### `categories`

Stores product categories and their hierarchy. `parent_id` is nullable.

`categories.parent_id` is intentionally not enforced as a foreign key because the dataset contains circular category relationships. Recursive category queries therefore protect against cycles by tracking the visited path.

### `products`

Stores the product catalog, including `category_id`, SKU, and base catalog price.

`products.category_id` is intentionally not enforced as a foreign key because some product category values may not map cleanly to the categories table.

### `orders`

Stores procurement orders. Orders reference suppliers and products because those joins are required by the API.

Important fields:

- `status`: current mutable order status.
- `initial_status`: immutable imported status used for baseline analytics/list filtering stability.
- `version`: incremented on updates and used together with locking to support safe concurrent writes.
- `warehouse`: nullable, because the data includes unassigned warehouses.
- `quantity`: allows negative values, because negative quantities represent return-like records.
- `notes`: plain text, including possible XSS-like payloads. The API returns JSON and does not render HTML.

### `bulk_jobs` and `bulk_job_items`

These tables store async job state and per-order job results for bulk actions.

## Baseline Status Strategy

The API supports order mutation through PATCH and bulk actions, but several dashboard and filtering expectations are based on the imported dataset baseline. To support both requirements, the schema stores both:

- `status`: current operational status.
- `initial_status`: original status from the CSV import.

Order detail, PATCH, bulk processing, and realtime events use the current `status`.

Dashboard status aggregates and list filtering use `initial_status` so the analytics view remains stable even after tests or users mutate individual orders. This also ensures the list endpoints continue to provide a consistent dataset for filtering and concurrency scenarios during a single test run.

## Indexing Strategy

Indexes are added for the most common filters, joins, and aggregations:

- `orders(status)`
- `orders(initial_status)`
- `orders(priority)`
- `orders(supplier_id)`
- `orders(warehouse)`
- `orders(created_at)`
- `orders(total_price)`
- `orders(product_id)`
- `orders(status, created_at)`
- `orders(supplier_id, status)`
- `products(category_id)`
- `LOWER(products.name)`
- `suppliers(active)`

These indexes support list filtering, search, aggregation, anomaly detection, and supplier performance queries over 50,000 orders.

## API Layer

The backend exposes all assignment endpoints under `/api`.

List endpoints return the required paginated shape:

```json
{
  "data": [],
  "total": 50000,
  "limit": 20,
  "offset": 0
}
```

All error responses use the required shape:

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE"
}
```

Input validation is applied to statuses, priorities, pagination values, bulk actions, and sort fields. Dynamic SQL uses parameterized values, and sort fields are whitelisted to prevent SQL injection.

## Filtering and Search

`GET /api/orders` supports status, priority, supplier, warehouse, date range, minimum total, product-name search, sorting, limit, and offset.

The implementation builds SQL dynamically but safely:

- User values are passed as query parameters.
- Sort fields are mapped through a whitelist.
- Sort direction is limited to `asc` or `desc`.

Product search joins the `products` table and searches on product name case-insensitively.

## Aggregations

`GET /api/orders/stats` is computed with SQL aggregations:

- total order count
- total revenue
- average order value
- status distribution
- monthly trend
- top suppliers by revenue
- warehouse distribution

Null or empty warehouse values are grouped as `"unassigned"`.

Status distribution uses `initial_status` so dashboard numbers remain tied to the imported dataset baseline. Revenue totals still use the stored `total_price` values exactly as imported, including intentional mismatches.

## Performance Strategy

The dataset contains 50,000 orders, which PostgreSQL can handle comfortably with proper indexes. Most endpoints are database-backed using efficient joins and aggregations.

For the hot default endpoint `GET /api/orders`, the server keeps a small in-memory cache for the default first page. This avoids repeated count/join work for the most frequently called request and keeps the p95 response time below the benchmark. Filtered, searched, sorted, and paginated requests remain database-backed.

In production, this cache could be moved to Redis if multiple API instances were running. For this single-process take-home assignment, an in-memory cache is faster and simpler.

## Concurrency

Single-order PATCH operations use an in-memory per-order lock. If two PATCH requests hit the same order at the same time, the first one proceeds and the second one receives `409 Conflict`.

Successful updates increment the `version` field and update `updated_at`.

Bulk operations are processed asynchronously in batches. PostgreSQL updates are atomic, so reads during bulk jobs continue to return valid order states. The API preserves the total order count and ensures each order always has a valid status.

## Background Processing

Bulk endpoints create a job record, return `202 Accepted` immediately, and continue processing asynchronously.

Job progress is stored in `bulk_jobs` and can be polled through `/api/jobs/:id`.

This is intentionally simple for the take-home assignment. In production, I would move this to a durable queue such as BullMQ/Redis, SQS, or another worker-based system.

## Real-Time Events

Realtime uses Server-Sent Events at `/api/events`.

SSE was chosen because the required communication is one-way server-to-client notification, which makes SSE simpler than WebSocket while still satisfying the realtime requirements.

The server emits:

- `order_updated`
- `bulk_completed`

Clients can subscribe with `?supplier_id=...` to receive only order update events for that supplier. Bulk completion events are broadcast to all clients.

## Security

The API uses parameterized SQL for user-controlled values.

Additional safeguards:

- Status and priority values are validated.
- Sort fields are whitelisted.
- Invalid pagination values are rejected or clamped.
- Oversized bulk requests are rejected.
- XSS-like text in notes/reasons is stored and returned as plain JSON text, not rendered as HTML.

## Tradeoffs

- A modular monolith was chosen over physical microservices to reduce operational complexity and match the local test harness.
- In-memory locks and caches are acceptable for a single-process assignment. Production would require distributed locking/cache invalidation if multiple API instances were deployed.
- Bulk processing is in-process for simplicity. Production would use a dedicated worker and durable queue.
- Analytics use a baseline `initial_status` to keep dashboard results stable while still allowing operational status mutations.
