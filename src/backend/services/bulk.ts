import pool from "../db/pool.js";
import { sseManager } from "../realtime/sse.js";
import { randomUUID } from "crypto";

interface BulkJob {
  id: string;
  status: string;
  total: number;
  completed: number;
  failed: number;
}

const VALID_ACTIONS = ["approve", "reject", "flag"];

export async function createBulkJob(
  orderIds: string[],
  action: string,
  reason?: string,
): Promise<string> {
  if (!orderIds || orderIds.length === 0) {
    throw new Error("Empty orderIds");
  }
  if (orderIds.length > 10000) {
    throw new Error("Too many order IDs");
  }
  if (!VALID_ACTIONS.includes(action)) {
    throw new Error("Invalid action");
  }

  const jobId = randomUUID();
  const now = new Date().toISOString();

  // Create job record
  await pool.query(
    `INSERT INTO bulk_jobs (id, status, total, completed, failed, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [jobId, "processing", orderIds.length, 0, 0, now, now],
  );

  // Process asynchronously
  setImmediate(() => processBulkJob(jobId, orderIds, action));

  return jobId;
}

async function processBulkJob(
  jobId: string,
  orderIds: string[],
  action: string,
) {
  try {
    const batchSize = 100;
    let completed = 0;
    let failed = 0;

    for (let i = 0; i < orderIds.length; i += batchSize) {
      const batch = orderIds.slice(i, i + batchSize);

      for (const orderId of batch) {
        try {
          // Get order
          const orderResult = await pool.query(
            "SELECT id, status FROM orders WHERE id = $1",
            [orderId],
          );
          const order = orderResult.rows[0];

          // Check if order exists and is not cancelled
          if (!order || order.status === "cancelled") {
            failed++;
            continue;
          }

          // Apply action
          if (action === "approve") {
            await pool.query(
              "UPDATE orders SET status = $1, updated_at = $2, version = version + 1 WHERE id = $3",
              ["approved", new Date().toISOString(), orderId],
            );
          } else if (action === "reject") {
            await pool.query(
              "UPDATE orders SET status = $1, updated_at = $2, version = version + 1 WHERE id = $3",
              ["rejected", new Date().toISOString(), orderId],
            );
          } else if (action === "flag") {
            // No status change, just count as completed
          }

          completed++;

          // Record in bulk_job_items
          await pool.query(
            `INSERT INTO bulk_job_items (job_id, order_id, status, error) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (job_id, order_id) DO UPDATE SET status = $3`,
            [jobId, orderId, "completed", null],
          );
        } catch (err: any) {
          failed++;
          await pool.query(
            `INSERT INTO bulk_job_items (job_id, order_id, status, error) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (job_id, order_id) DO UPDATE SET status = $3, error = $4`,
            [jobId, orderId, "failed", err.message],
          );
        }
      }

      // Update job progress
      await pool.query(
        "UPDATE bulk_jobs SET completed = $1, failed = $2, updated_at = $3 WHERE id = $4",
        [completed, failed, new Date().toISOString(), jobId],
      );
    }

    // Mark job as completed
    const finalStatus =
      failed === 0
        ? "completed"
        : failed === completed
          ? "failed"
          : "completed";
    await pool.query(
      "UPDATE bulk_jobs SET status = $1, updated_at = $2 WHERE id = $3",
      [finalStatus, new Date().toISOString(), jobId],
    );

    // Emit bulk_completed event
    sseManager.broadcast({
      type: "bulk_completed",
      data: { jobId },
    });
  } catch (err) {
    console.error("Bulk job processing error:", err);
    await pool.query(
      "UPDATE bulk_jobs SET status = $1, updated_at = $2 WHERE id = $3",
      ["failed", new Date().toISOString(), jobId],
    );
  }
}

export async function getBulkJob(jobId: string): Promise<BulkJob | null> {
  const result = await pool.query(
    "SELECT id, status, total, completed, failed FROM bulk_jobs WHERE id = $1",
    [jobId],
  );
  return result.rows[0] || null;
}
