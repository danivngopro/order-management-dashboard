import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import { readFileSync } from 'fs';
import pool from './pool.js';
import { IMPORT } from '../config/constants.js';
import { logger } from '../utils/logger.js';

async function seedDatabase() {
  try {
    logger.info('Seeding database...');

    // Execute schema
    logger.info('Executing schema...');
    const schema = readFileSync(new URL('./schema.sql', import.meta.url), 'utf-8');
    await pool.query(schema);

    // Import categories
    logger.info('Importing categories...');
    await importCategories();

    // Import suppliers
    logger.info('Importing suppliers...');
    await importSuppliers();

    // Import products
    logger.info('Importing products...');
    await importProducts();

    // Import orders
    logger.info('Importing orders...');
    await importOrders();

    logger.info('Seeding complete!');
    await pool.end();
  } catch (err) {
    logger.error('Seeding failed', { err });
    await pool.end();
    process.exit(1);
  }
}

async function importCategories() {
  const records: any[] = [];
  return new Promise((resolve, reject) => {
    createReadStream(new URL('../../../data/categories.csv', import.meta.url))
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => {
        records.push(row);
      })
      .on('end', async () => {
        try {
          for (let i = 0; i < records.length; i += IMPORT.CHUNK_SIZE) {
            const chunk = records.slice(i, i + IMPORT.CHUNK_SIZE);
            await insertCategories(chunk);
          }
          resolve(null);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

async function insertCategories(records: any[]) {
  const query = `INSERT INTO categories (id, name, parent_id) VALUES ($1, $2, $3)`;
  for (const row of records) {
    const parent_id = row.parent_id ? row.parent_id.trim() : null;
    await pool.query(query, [row.id, row.name, parent_id || null]);
  }
}

async function importSuppliers() {
  const records: any[] = [];
  return new Promise((resolve, reject) => {
    createReadStream(new URL('../../../data/suppliers.csv', import.meta.url))
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => {
        records.push(row);
      })
      .on('end', async () => {
        try {
          for (let i = 0; i < records.length; i += IMPORT.CHUNK_SIZE) {
            const chunk = records.slice(i, i + IMPORT.CHUNK_SIZE);
            await insertSuppliers(chunk);
          }
          resolve(null);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

async function insertSuppliers(records: any[]) {
  const query = `INSERT INTO suppliers (id, name, email, rating, country, active, created_at) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`;
  for (const row of records) {
    const rating = row.rating ? (row.rating.trim() === '' ? null : parseFloat(row.rating)) : null;
    const active = row.active === 'true' || row.active === 'True';
    await pool.query(query, [
      row.id,
      row.name,
      row.email || null,
      rating,
      row.country || null,
      active,
      row.created_at || null,
    ]);
  }
}

async function importProducts() {
  const records: any[] = [];
  return new Promise((resolve, reject) => {
    createReadStream(new URL('../../../data/products.csv', import.meta.url))
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => {
        records.push(row);
      })
      .on('end', async () => {
        try {
          for (let i = 0; i < records.length; i += IMPORT.CHUNK_SIZE) {
            const chunk = records.slice(i, i + IMPORT.CHUNK_SIZE);
            await insertProducts(chunk);
          }
          resolve(null);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

async function insertProducts(records: any[]) {
  const query = `INSERT INTO products (id, name, category_id, sku, price) VALUES ($1, $2, $3, $4, $5)`;
  for (const row of records) {
    const category_id = row.category_id ? row.category_id.trim() : null;
    await pool.query(query, [row.id, row.name, category_id || null, row.sku || null, parseFloat(row.price)]);
  }
}

async function importOrders() {
  const records: any[] = [];
  return new Promise((resolve, reject) => {
    createReadStream(new URL('../../../data/orders.csv', import.meta.url))
      .pipe(parse({ columns: true, skip_empty_lines: true }))
      .on('data', (row) => {
        records.push(row);
      })
      .on('end', async () => {
        try {
          for (let i = 0; i < records.length; i += IMPORT.CHUNK_SIZE) {
            const chunk = records.slice(i, i + IMPORT.CHUNK_SIZE);
            await insertOrders(chunk);
          }
          resolve(null);
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
}

async function insertOrders(records: any[]) {
  const query = `INSERT INTO orders (id, supplier_id, product_id, quantity, unit_price, total_price, status, initial_status, priority, created_at, updated_at, warehouse, notes, version) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`;
  for (const row of records) {
    const warehouse = row.warehouse ? (row.warehouse.trim() === '' ? null : row.warehouse) : null;
    const notes = row.notes ? (row.notes.trim() === '' ? null : row.notes) : null;
    await pool.query(query, [
      row.id,
      row.supplier_id,
      row.product_id,
      parseInt(row.quantity),
      parseFloat(row.unit_price),
      parseFloat(row.total_price),
      row.status,
      row.status,
      row.priority,
      row.created_at,
      row.updated_at,
      warehouse,
      notes,
      1,
    ]);
  }
}

seedDatabase();
