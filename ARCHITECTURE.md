# Architecture

## Overview

This project uses a modular monolith: a single Node.js/TypeScript Express server on port 3000, with internal modules for orders, suppliers, products, analytics, anomaly detection, bulk jobs, and realtime events. This fits the assignment because the test suite expects one API process under `/api`, while still keeping the code organized in a way that could later be split into separate services.

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

The schema mirrors the CSV files:

- `suppliers`: supplier metadata and active flag.
- `categories`: category hierarchy with nullable `parent_id`.
- `products`: product catalog and category reference.
- `orders`: procurement orders, including `version` for optimistic/concurrent updates.
- `bulk_jobs`: async bulk job state.
- `bulk_job_items`: per-order job results.

Some relationships are intentionally not enforced with foreign keys. `categories.parent_id` is not an FK because the input includes circular category relationships. `products.category_id` is not an FK because some product category values may not map cleanly. Orders do reference suppliers and products because those references are required for the API joins.

## Indexing Strategy

Indexes are added for the most common filters and joins:

- `orders(status)`
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

These support list filtering, search, aggregation, and supplier performance queries over 50,000 orders.

## Concurrency

Single-order PATCH operations use an in-memory per-order lock. If two PATCH requests hit the same order at the same time, the first one proceeds and the second one receives `409 Conflict`. Updates also increment the `version` field.

Bulk operations are processed asynchronously and update orders in small batches. Reads remain valid while the job is running because PostgreSQL updates are atomic and every order always has a valid status.

## Background Processing

Bulk endpoints create a row in `bulk_jobs`, return `202 Accepted` immediately, and start async processing using `setImmediate`. Job progress is persisted in `bulk_jobs` and can be polled through `/api/jobs/:id`.

This is intentionally simple for the take-home. In production, this could be moved to Redis/BullMQ, SQS, or another durable queue.

## Real-Time Events

Realtime uses Server-Sent Events at `/api/events`. SSE is simpler than WebSocket for one-way server notifications and is enough for the required events:

- `order_updated`
- `bulk_completed`

Clients can subscribe with `?supplier_id=...` to receive only order update events for that supplier. Bulk completion events are broadcast to all connected clients.

## Tradeoffs

- A modular monolith was chosen over physical microservices to reduce operational complexity and fit the test harness.
- In-memory SSE subscribers are acceptable for a single-process assignment. Production would need a shared pub/sub system.
- Bulk processing is implemented in-process. Production would use a separate worker and durable queue.
- Notes containing XSS-like payloads are stored as plain text and returned as JSON. The API does not render HTML.
