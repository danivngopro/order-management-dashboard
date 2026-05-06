-- Drop all tables if they exist
DROP TABLE IF EXISTS bulk_job_items CASCADE;
DROP TABLE IF EXISTS bulk_jobs CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Categories table
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT NULL
);

-- Suppliers table
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  rating NUMERIC NULL,
  country TEXT,
  active BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ
);

-- Products table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category_id TEXT NULL,
  sku TEXT,
  price NUMERIC NOT NULL
);

-- Orders table
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  warehouse TEXT NULL,
  notes TEXT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

-- Bulk jobs table
CREATE TABLE bulk_jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  total INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bulk job items table
CREATE TABLE bulk_job_items (
  job_id TEXT NOT NULL REFERENCES bulk_jobs(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  status TEXT NOT NULL,
  error TEXT NULL,
  PRIMARY KEY (job_id, order_id)
);

-- Indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_priority ON orders(priority);
CREATE INDEX idx_orders_supplier_id ON orders(supplier_id);
CREATE INDEX idx_orders_warehouse ON orders(warehouse);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_orders_total_price ON orders(total_price);
CREATE INDEX idx_orders_product_id ON orders(product_id);
CREATE INDEX idx_orders_status_created_at ON orders(status, created_at);
CREATE INDEX idx_orders_supplier_status ON orders(supplier_id, status);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_suppliers_active ON suppliers(active);
