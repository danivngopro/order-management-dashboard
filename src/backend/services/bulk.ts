import pool from '../db/pool.js';
import { sseManager } from '../realtime/sse.js';
import { randomUUID } from 'crypto';

interface BulkJob {
  id: string;
  status: string;
  total: number;
  completed: number;
  failed: number;
}

const VALID_ACTIONS = ['approve', 'reject', 'flag'];

export async function createBulkJob(orderIds: string[], action: string, reason?: string): Promise<string> {
  if (!Array.isArray(orderIds) || orderIds.length === 0) throw new Error('Empty orderIds');
  if (orderIds.length > 10000) throw new Error('Too many order IDs');
  if (!VALID_ACTIONS.includes(action)) throw new Error('Invalid action');

  const jobId = randomUUID();
  await pool.query(
    `INSERT INTO bulk_jobs (id, status, total, completed, failed)
     VALUES ($1, 'processing', $2, 0, 0)`,
    [jobId, orderIds.length]
  );

  setImmediate(() => {
    processBulkJob(jobId, orderIds, action).catch((err) => {
      console.error('Bulk job processing error:', err);
    });
  });

  return jobId;
}

async function processBulkJob(jobId: string, orderIds: string[], action: string) {
  let completed = 0;
  let failed = 0;
  const batchSize = 250;

  try {
    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batch = orderIds.slice(i, i + batchSize);

      for (const orderId of batch) {
        try {
          const orderRes = await pool.query('SELECT id, status FROM orders WHERE id = $1', [orderId]);
          const order = orderRes.rows[0];
          if (!order || order.status === 'cancelled') {
            failed++;
            await recordItem(jobId, orderId, 'failed', !order ? 'Order not found' : 'Order is cancelled');
            continue;
          }

          if (action === 'approve' || action === 'reject') {
            const newStatus = action === 'approve' ? 'approved' : 'rejected';
            await pool.query(
              `UPDATE orders
               SET status = $1, updated_at = now(), version = version + 1
               WHERE id = $2`,
              [newStatus, orderId]
            );
          }

          completed++;
          await recordItem(jobId, orderId, 'completed', null);
        } catch (err: any) {
          failed++;
          await recordItem(jobId, orderId, 'failed', err?.message || 'Unknown error');
        }
      }

      await pool.query(
        'UPDATE bulk_jobs SET completed = $1, failed = $2, updated_at = now() WHERE id = $3',
        [completed, failed, jobId]
      );
      await new Promise((resolve) => setImmediate(resolve));
    }

    const finalStatus = completed > 0 ? 'completed' : 'failed';
    await pool.query(
      'UPDATE bulk_jobs SET status = $1, completed = $2, failed = $3, updated_at = now() WHERE id = $4',
      [finalStatus, completed, failed, jobId]
    );

    sseManager.broadcast({ type: 'bulk_completed', data: { jobId } });
  } catch (err: any) {
    await pool.query(
      'UPDATE bulk_jobs SET status = $1, completed = $2, failed = $3, updated_at = now() WHERE id = $4',
      ['failed', completed, failed, jobId]
    );
  }
}

async function recordItem(jobId: string, orderId: string, status: string, error: string | null) {
  await pool.query(
    `INSERT INTO bulk_job_items (job_id, order_id, status, error)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (job_id, order_id)
     DO UPDATE SET status = EXCLUDED.status, error = EXCLUDED.error`,
    [jobId, orderId, status, error]
  );
}

export async function getBulkJob(jobId: string): Promise<BulkJob | null> {
  const result = await pool.query(
    'SELECT id, status, total::int AS total, completed::int AS completed, failed::int AS failed FROM bulk_jobs WHERE id = $1',
    [jobId]
  );
  return result.rows[0] || null;
}
