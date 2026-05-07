# Order Management Dashboard Frontend

A modern React + TypeScript frontend for the procurement order-management dashboard built with Vite.

## 📁 Project Structure

```
src/frontend/
├── src/
│   ├── main.tsx              # React app entry point
│   ├── App.tsx               # Main app component with navigation
│   ├── api.ts                # API client wrapper
│   ├── types.ts              # TypeScript interfaces
│   ├── index.css             # Global styles
│   ├── views/
│   │   ├── OrdersTable.tsx   # Orders view with filters & bulk actions
│   │   ├── AnalyticsDashboard.tsx  # Dashboard with charts
│   │   └── SupplierDetail.tsx      # Supplier detail view
│   └── components/
│       ├── BulkActionModal.tsx     # Confirmation modal for bulk actions
│       └── BulkProgressModal.tsx   # Progress display for bulk jobs
├── index.html                # HTML entry point
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript config
├── tsconfig.node.json        # TypeScript config for Vite
└── package.json              # Frontend dependencies
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm installed
- Backend API running on `http://localhost:3000`
- PostgreSQL and Redis running (via Docker)

### 1. Install dependencies

```bash
# Root level - install backend dependencies
npm install

# Install frontend dependencies
cd src/frontend
npm install
cd ../..
```

### 2. Start services

```bash
# Terminal 1: Start PostgreSQL & Redis
docker-compose up -d

# Terminal 2: Seed the database
npm run seed

# Terminal 3: Start the backend API
npm run dev
# Backend will be at http://localhost:3000
```

### 3. Start the frontend

```bash
# Terminal 4: Start the frontend dev server
npm run dev:frontend
# Frontend will be at http://localhost:5173
```

The frontend will automatically proxy API calls to the backend at `http://localhost:3000`.

## 📦 Build for Production

```bash
# Build the frontend
npm run build:frontend

# Output: src/frontend/dist/
```

## 🧪 Running Tests

After starting the backend and seeding the database, run the test suite:

```bash
cd tests
npm install
npm test
```

## 📊 Frontend Features

### 1. **Orders Table** (`/views/OrdersTable.tsx`)

- **Pagination**: Server-side pagination with 20 orders per page
- **Filtering**: Status, priority, supplier, warehouse, date range, text search
- **Sorting**: Click column headers to sort by ID, quantity, total price, or date
- **Multi-select**: Checkbox to select multiple orders
- **Bulk Actions**: Approve, reject, or flag selected orders in one operation
- **Job Tracking**: Real-time progress display with polling every 500ms
- **States**: Loading spinner, error messages, empty state

### 2. **Analytics Dashboard** (`/views/AnalyticsDashboard.tsx`)

- **Summary Cards**: Total orders, total revenue, average order value
- **Monthly Trend**: Line chart of order volume over time
- **Status Distribution**: Pie chart showing order counts by status
- **Warehouse Distribution**: Bar chart of orders per warehouse
- **Top Suppliers**: Bar chart and table of suppliers by revenue
- **Interactive**: Click supplier names to view details
- **Charts**: Built with Recharts for lightweight, responsive visualizations

### 3. **Supplier Detail** (`/views/SupplierDetail.tsx`)

- **Supplier Info**: Name, email, country, rating, active status
- **Performance Metrics**:
  - Total orders and revenue
  - Average delivery days
  - Rejection rate
  - Price consistency
  - Average order value
- **Monthly Trend**: Line chart of order volume from this supplier
- **Order History**: Paginated table of all orders from the supplier
- **Navigation**: Back button to return to orders table

### 4. **Navigation**

- Sidebar with links to Orders, Analytics, and Supplier views
- Active link highlighting
- Responsive layout (sidebar converts to top nav on mobile)

## 🛠️ Technology Stack

- **React 18**: UI library
- **TypeScript**: Type-safe JavaScript
- **Vite**: Lightning-fast build tool
- **Recharts**: Lightweight charting library
- **CSS**: Plain CSS with CSS modules pattern (no build tool needed)

## 🎨 Styling

The frontend uses a professional dashboard design with:

- Clean, readable typography
- Consistent color scheme and spacing
- Responsive grid layout
- Status badges with semantic colors
- Hover effects and transitions
- Dark sidebar with light content area
- Mobile-responsive design

All styles are in `src/index.css` - no external UI framework needed.

## 🔌 API Client

The `api.ts` module provides a simple, typed wrapper around the backend API:

```typescript
import { apiClient } from "./api";

// Get paginated orders with filters
const result = await apiClient.getOrders({
  limit: 20,
  offset: 0,
  status: "pending",
  priority: "high",
});

// Get supplier details
const supplier = await apiClient.getSupplierById("sup_001");

// Bulk action
const job = await apiClient.bulkAction({
  orderIds: ["ord_1", "ord_2"],
  action: "approve",
  reason: "Auto-approved",
});

// Poll job status
const jobStatus = await apiClient.getJobStatus(job.jobId);
```

## 🧩 Component Architecture

All views follow a consistent pattern:

1. **State Management**: `useState` for local state, no external store needed
2. **Data Loading**: `useEffect` to fetch data on mount
3. **Error Handling**: Try/catch with user-friendly error messages
4. **Loading States**: Spinner while fetching data
5. **Empty States**: Message when no results found

No Redux, Zustand, or Context API needed - the component structure is simple enough for `useState`/`useEffect`.

## 🚨 Error Handling

All views properly handle:

- **Loading**: Shows spinner while fetching
- **Errors**: Displays error message to user
- **Empty Results**: Shows empty state message
- **Failed Bulk Actions**: Displays failed job status

## ♿ Accessibility

- Semantic HTML elements
- Proper form labels
- Keyboard navigation support
- Color contrast meets WCAG standards
- Focus states on interactive elements

## 🔐 Security

- No mock data mixed with real API data
- Input validation through type checking
- No client-side authentication (backend handles auth)
- API responses validated via TypeScript types

## 📱 Responsive Design

- Works on desktop, tablet, and mobile
- Sidebar toggles layout on smaller screens
- Tables scroll horizontally on mobile
- Filters stack vertically on small screens

## 🐛 Debugging

View the browser console for:

- API responses and errors
- React warnings during development
- State changes

The frontend communicates with the backend at `http://localhost:3000/api`.

## 📚 Key Files Reference

| File                               | Purpose                                   |
| ---------------------------------- | ----------------------------------------- |
| `src/App.tsx`                      | Main app component with navigation        |
| `src/api.ts`                       | API client wrapper for all backend calls  |
| `src/types.ts`                     | TypeScript interfaces for API data        |
| `src/views/OrdersTable.tsx`        | Orders view with all filtering/pagination |
| `src/views/AnalyticsDashboard.tsx` | Dashboard with charts and metrics         |
| `src/views/SupplierDetail.tsx`     | Supplier profile and order history        |
| `src/index.css`                    | All CSS styles (no external framework)    |

## ✅ Checklist

- [x] React + TypeScript with Vite
- [x] Orders table with pagination, filters, sorting
- [x] Multi-select and bulk actions
- [x] Bulk job progress tracking
- [x] Analytics dashboard with charts
- [x] Supplier detail view
- [x] Loading, error, empty states everywhere
- [x] Professional, responsive UI
- [x] Simple component architecture
- [x] No authentication required
- [x] API client wrapper
- [x] No external UI framework (plain CSS)

## 🎯 Next Steps

1. Install dependencies: `cd src/frontend && npm install`
2. Start backend: `npm run dev` (from root)
3. Start frontend: `npm run dev:frontend` (from root)
4. Open `http://localhost:5173` in your browser
5. Run tests: `cd tests && npm test`
