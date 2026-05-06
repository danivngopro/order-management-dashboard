import express, { Request, Response, NextFunction } from "express";
import pool from "./db/pool.js";

export const app = express();

app.use(express.json());

// Health check
app.get("/health", async (req: Request, res: Response) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch (err) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────

import ordersRouter from "./routes/orders.js";
import suppliersRouter from "./routes/suppliers.js";
import productsRouter from "./routes/products.js";
import { getBulkJob } from "./services/bulk.js";
import { sseManager } from "./realtime/sse.js";

app.use("/api/orders", ordersRouter);
app.use("/api/suppliers", suppliersRouter);
app.use("/api/products", productsRouter);

// GET /api/jobs/:id
app.get("/api/jobs/:id", async (req: Request, res: Response) => {
  try {
    const job = await getBulkJob(req.params.id);
    if (!job) {
      return res
        .status(404)
        .json({ error: "Job not found", code: "NOT_FOUND" });
    }
    res.json({
      status: job.status,
      progress: {
        total: job.total,
        completed: job.completed,
        failed: job.failed,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

// GET /api/events (SSE)
app.get("/api/events", (req: Request, res: Response) => {
  const supplier_id = req.query.supplier_id as string;
  sseManager.subscribe(res, supplier_id);
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: "Not found", code: "NOT_FOUND" });
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("Error:", err);
  res
    .status(500)
    .json({ error: "Internal server error", code: "INTERNAL_ERROR" });
});
