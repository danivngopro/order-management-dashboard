import pool from '../db/pool.js';

interface Product {
  id: string;
  name: string;
  category_id?: string;
  sku?: string;
  price: number;
}

interface ListOptions {
  limit?: number;
  offset?: number;
  category?: string;
}

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value as number) || value === undefined) return 20;
  if (value < 0) return Math.min(Math.abs(value), 100);
  return Math.min(value, 1000);
}

const categoryCte = `
  WITH RECURSIVE category_tree AS (
    SELECT id, parent_id, ARRAY[id] AS path
    FROM categories
    WHERE id = $1
    UNION ALL
    SELECT c.id, c.parent_id, ct.path || c.id
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
    WHERE NOT c.id = ANY(ct.path)
  )
`;

export async function getProducts(options: ListOptions) {
  const limit = normalizeLimit(options.limit);
  const offset = Math.max(options.offset || 0, 0);

  let total: number;
  let rows: Product[];

  if (options.category) {
    const countResult = await pool.query(
      `${categoryCte} SELECT COUNT(*)::int AS count FROM products p WHERE p.category_id IN (SELECT id FROM category_tree)`,
      [options.category]
    );
    total = Number(countResult.rows[0].count);

    const result = await pool.query(
      `${categoryCte} SELECT id, name, category_id, sku, price::float8 AS price
       FROM products p
       WHERE p.category_id IN (SELECT id FROM category_tree)
       ORDER BY id LIMIT $2 OFFSET $3`,
      [options.category, limit, offset]
    );
    rows = result.rows;
  } else {
    const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM products');
    total = Number(countResult.rows[0].count);
    const result = await pool.query(
      'SELECT id, name, category_id, sku, price::float8 AS price FROM products ORDER BY id LIMIT $1 OFFSET $2',
      [limit, offset]
    );
    rows = result.rows;
  }

  return { data: rows, total, limit, offset };
}
