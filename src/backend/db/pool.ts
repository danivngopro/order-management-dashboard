import { Pool } from 'pg';
import { ENV } from '../config/env.js';

const pool = new Pool({
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  database: ENV.DB_NAME,
  user: ENV.DB_USER,
  password: ENV.DB_PASSWORD,
});

export default pool;
