import pool from "../db/pool.js";

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

export async function getProducts(options: ListOptions) {
  let limit = Math.min(options.limit || 20, 1000);
  const offset = Math.max(options.offset || 0, 0);

  let query = "SELECT * FROM products WHERE 1=1";
  let params: any[] = [];

  if (options.category) {
    // Get all categories including parent
    query = `
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
      SELECT p.* FROM products p
      WHERE p.category_id IN (SELECT id FROM category_tree)
    `;
    params.push(options.category);
  }

  // Get total count
  let countQuery = "SELECT COUNT(*) as count FROM products WHERE 1=1";
  let countParams: any[] = [];

  if (options.category) {
    countQuery = `
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
      SELECT COUNT(*) as count FROM products p
      WHERE p.category_id IN (SELECT id FROM category_tree)
    `;
    countParams.push(options.category);
  }

  const countResult = await pool.query(countQuery, countParams);
  const total = parseInt(countResult.rows[0].count);

  if (options.category) {
    query += ` ORDER BY id LIMIT $2 OFFSET $3`;
    params.push(limit, offset);
  } else {
    query = "SELECT * FROM products ORDER BY id LIMIT $1 OFFSET $2";
    params = [limit, offset];
  }

  const result = await pool.query(query, params);

  return {
    data: result.rows as Product[],
    total,
    limit,
    offset,
  };
}
