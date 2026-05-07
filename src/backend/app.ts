import express, { NextFunction, Request, Response } from 'express';
import pool from './db/pool.js';
import { ENV } from './config/env.js';
import { sseManager } from './realtime/sse.js';
import { getBulkJob } from './services/bulk.js';
import { idParamSchema } from './schemas/common.js';
import {
  getValidatedParams,
  validateParams,
} from './utils/validate.js';
import { ERRORS, sendError } from './utils/errors.js';
import { logger } from './utils/logger.js';

import ordersRouter from './routes/orders.js';
import suppliersRouter from './routes/suppliers.js';
import productsRouter from './routes/products.js';

export const app = express();

app.use(express.json({ limit: ENV.JSON_BODY_LIMIT }));

// Health check
app.get('/health', async (_req: Request, res: Response) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (err) {
    logger.error('Health check failed', { err });
    sendError(res, ERRORS.databaseConnectionFailed);
  }
});

// ─── Routes ───────────────────────────────────────────────────────────

app.use('/api/orders', ordersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/products', productsRouter);

// GET /api/jobs/:id
app.get('/api/jobs/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const { id } = getValidatedParams<{ id: string }>(req);
    const job = await getBulkJob(id);
    if (!job) return sendError(res, ERRORS.jobNotFound);

    res.json({
      status: job.status,
      progress: {
        total: job.total,
        completed: job.completed,
        failed: job.failed,
      },
    });
  } catch (err) {
    logger.error('GET /api/jobs/:id failed', { err });
    sendError(res, ERRORS.internalError);
  }
});

// GET /api/events (SSE)
app.get('/api/events', (req: Request, res: Response) => {
  const supplierId = typeof req.query.supplier_id === 'string' ? req.query.supplier_id : undefined;
  sseManager.subscribe(res, supplierId);
});

// 404 handler
app.use((_req: Request, res: Response) => {
  sendError(res, ERRORS.notFound);
});

// Error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled request error', { err });

  if (err?.type === 'entity.too.large') {
    return sendError(res, ERRORS.requestBodyTooLarge);
  }

  if (err instanceof SyntaxError || err?.type === 'entity.parse.failed') {
    return sendError(res, ERRORS.invalidJsonBody);
  }

  sendError(res, ERRORS.internalError);
});
