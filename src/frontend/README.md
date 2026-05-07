# Frontend README

## Overview

This is the React + TypeScript frontend for the Procurement Order Management Dashboard.

The frontend provides a clean dashboard interface for:

- browsing and filtering procurement orders
- performing bulk order actions
- viewing analytics and operational metrics
- drilling into supplier performance
- monitoring loading, error, and empty states across views

The frontend consumes the existing backend API under `/api`. The backend must be running on port `3000`.

## Tech Stack

- React
- TypeScript
- Vite
- Recharts
- Plain CSS

The UI intentionally avoids heavy styling frameworks to keep the project simple, readable, and easy to review.

## Location

The frontend lives under:

```text
src/frontend
```

## Running the Project

### 1. Start infrastructure

From the project root:

```bash
docker compose up -d
```

This starts the PostgreSQL/Redis services provided by the assignment.

### 2. Seed the database

From the project root:

```bash
npm run seed
```

### 3. Start the backend

From the project root:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:3000
```

### 4. Start the frontend

From the project root:

```bash
npm run dev:frontend
```

Or directly from the frontend directory:

```bash
cd src/frontend
npm install
npm run dev
```

The frontend runs at Vite's default local URL:

```text
http://localhost:5173
```

## Build

From the project root:

```bash
npm run build:frontend
```

Or directly from the frontend directory:

```bash
cd src/frontend
npm run build
```

## Frontend Scripts

The root project includes frontend helper scripts:

```bash
npm run dev:frontend
npm run build:frontend
npm run preview:frontend
```

Inside `src/frontend`, the local scripts are:

```bash
npm run dev
npm run build
npm run preview
```

## Project Structure

```text
src/frontend/
  index.html
  package.json
  vite.config.ts
  tsconfig.json
  tsconfig.node.json

  src/
    main.tsx
    App.tsx
    api.ts
    types.ts
    utils/
      formatting.ts
    components/
      BulkActionModal.tsx
      BulkProgressModal.tsx
    views/
      OrdersTable.tsx
      AnalyticsDashboard.tsx
      SupplierDetail.tsx
    index.css
```

## Main Views

### Orders Table

The Orders view allows users to browse procurement orders with server-side pagination.

Features:

- paginated table
- server-side filters
- status filter
- priority filter
- supplier autocomplete
- warehouse selector
- date range filters
- text search
- sortable columns
- multi-select rows
- bulk approve/reject/flag actions
- job progress polling after bulk actions
- loading, error, and empty states

The supplier filter is user-friendly: users select by supplier name, while the API receives the supplier ID.

The warehouse filter uses selectable values instead of requiring the user to type exact backend values such as `warehouse_south`.

### Analytics Dashboard

The Analytics Dashboard consumes:

```text
GET /api/orders/stats
```

It displays:

- total orders
- total revenue
- average order value
- monthly order volume
- status distribution
- top suppliers by revenue
- warehouse distribution

The dashboard transforms backend response shapes into chart-friendly arrays where needed. For example, status data may arrive as an object keyed by status, so the frontend converts it into an array before passing it to Recharts.

### Supplier Detail

The Supplier Detail view is opened by clicking supplier names in the dashboard or order-related views.

It consumes:

```text
GET /api/suppliers/:id
GET /api/suppliers/:id/performance
GET /api/orders?supplier_id=:id
```

It displays:

- supplier profile details
- active/inactive state
- order count
- total revenue
- average delivery days
- rejection rate
- average order value
- price consistency
- monthly trend chart
- supplier order history

A Supplier Detail navigation item appears only after a supplier has been selected.

## API Integration

The frontend uses a small typed API client in:

```text
src/frontend/src/api.ts
```

The API client wraps backend requests and centralizes URL/query construction.

Key endpoints used:

```text
GET    /api/orders
GET    /api/orders/:id
PATCH  /api/orders/:id

GET    /api/suppliers
GET    /api/suppliers/:id
GET    /api/suppliers/:id/performance

GET    /api/products
GET    /api/orders/stats

POST   /api/orders/bulk-action
GET    /api/jobs/:id
```

## Formatting

Common formatting helpers live under:

```text
src/frontend/src/utils/formatting.ts
```

These helpers keep the UI consistent for:

- currency
- large numbers
- percentages
- dates
- status labels
- warehouse labels

Examples:

```text
$230,810,064.99
50,000
64.9%
warehouse_south -> South
```

## State Handling

Each main view handles:

- loading states
- error states
- empty states

Charts also show a friendly placeholder when there is no usable data instead of rendering an empty or broken chart.

## Bulk Actions

Bulk actions are handled from the Orders table.

Flow:

1. User selects one or more orders.
2. User chooses an action: approve, reject, or flag.
3. Confirmation modal opens.
4. Frontend sends request to:

```text
POST /api/orders/bulk-action
```

5. Backend returns a `jobId`.
6. Frontend polls:

```text
GET /api/jobs/:id
```

7. Progress modal updates until the job completes or fails.

## Notes and Tradeoffs

- The frontend is intentionally a single-page Vite app rather than a separately containerized service.
- The backend remains the source of truth for filtering, sorting, pagination, aggregation, and bulk processing.
- Client state is managed with React `useState` and `useEffect`, which is sufficient for this project size.
- No authentication is implemented because it is outside the assignment scope.
- The frontend does not modify backend behavior or database schema.
