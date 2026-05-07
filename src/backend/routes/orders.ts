import { Router, Request, Response } from 'express';
import { getOrders, getOrderById, patchOrder, getOrderStats } from '../services/orders.js';
import { getAnomalies } from '../services/anomalies.js';
import { createBulkJob } from '../services/bulk.js';
import { sseManager } from '../realtime/sse.js';
import { idParamSchema } from '../schemas/common.js';
import {
  bulkActionBodySchema,
  bulkActionsBodySchema,
  BulkActionBody,
  BulkActionsBody,
  listOrdersQuerySchema,
  ListOrdersQuery,
  patchOrderBodySchema,
  PatchOrderBody,
} from '../schemas/orders.js';
import {
  getValidatedBody,
  getValidatedParams,
  getValidatedQuery,
  validateBody,
  validateParams,
  validateQuery,
} from '../utils/validate.js';
import { ERRORS, sendError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/orders/stats - MUST come before /:id
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getOrderStats();
    res.json(stats);
  } catch (err) {
    logger.error('GET /api/orders/stats failed', { err });
    sendError(res, ERRORS.internalError);
  }
});

// GET /api/orders/anomalies - MUST come before /:id
router.get('/anomalies', async (_req: Request, res: Response) => {
  try {
    const anomalies = await getAnomalies();
    res.json({ data: anomalies });
  } catch (err) {
    logger.error('GET /api/orders/anomalies failed', { err });
    sendError(res, ERRORS.internalError);
  }
});

// GET /api/orders
router.get('/', validateQuery(listOrdersQuerySchema), async (req: Request, res: Response) => {
  try {
    const query = getValidatedQuery<ListOrdersQuery>(req);
    const data = await getOrders(query);
    res.json(data);
  } catch (err) {
    logger.error('GET /api/orders failed', { err });
    sendError(res, ERRORS.badRequest);
  }
});

// GET /api/orders/:id
router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const { id } = getValidatedParams<{ id: string }>(req);
    const order = await getOrderById(id);
    if (!order) return sendError(res, ERRORS.orderNotFound);
    res.json(order);
  } catch (err) {
    logger.error('GET /api/orders/:id failed', { err });
    sendError(res, ERRORS.internalError);
  }
});

// PATCH /api/orders/:id
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(patchOrderBodySchema),
  async (req: Request, res: Response) => {
    try {
      const { id } = getValidatedParams<{ id: string }>(req);
      const body = getValidatedBody<PatchOrderBody>(req);
      const result = await patchOrder(id, body);

      if (result.error === 'Order is being updated') return sendError(res, ERRORS.orderUpdateConflict);
      if (result.error === 'Order not found') return sendError(res, ERRORS.orderNotFound);
      if (result.error === 'Order is cancelled') return sendError(res, ERRORS.cancelledOrderConflict);
      if (result.error === 'Invalid status') return sendError(res, ERRORS.invalidStatus);
      if (result.error === 'Invalid priority') return sendError(res, ERRORS.invalidPriority);

      if (body.status && result.order) {
        sseManager.broadcastToSupplier(result.order.supplier_id, {
          type: 'order_updated',
          data: {
            id: result.order.id,
            old_status: result.oldStatus ?? 'unknown',
            new_status: body.status,
            updated_at: result.order.updated_at,
          },
        });
      }

      res.json(result.order);
    } catch (err) {
      logger.error('PATCH /api/orders/:id failed', { err });
      sendError(res, ERRORS.internalError);
    }
  }
);

async function handleBulkAction(req: Request, res: Response, responseKey: 'jobId' | 'job_id') {
  const body = getValidatedBody<BulkActionBody | BulkActionsBody>(req);
  const orderIds = 'orderIds' in body ? body.orderIds : body.order_ids;
  const jobId = await createBulkJob(orderIds, body.action, body.reason);
  res.status(202).json({ [responseKey]: jobId });
}

// POST /api/orders/bulk-action
router.post('/bulk-action', validateBody(bulkActionBodySchema), async (req: Request, res: Response) => {
  try {
    await handleBulkAction(req, res, 'jobId');
  } catch (err) {
    logger.warn('POST /api/orders/bulk-action failed', { err });
    sendError(res, ERRORS.badRequest);
  }
});

// POST /api/orders/bulk
router.post('/bulk', validateBody(bulkActionBodySchema), async (req: Request, res: Response) => {
  try {
    await handleBulkAction(req, res, 'jobId');
  } catch (err) {
    logger.warn('POST /api/orders/bulk failed', { err });
    sendError(res, ERRORS.badRequest);
  }
});

// POST /api/orders/bulk-actions
router.post('/bulk-actions', validateBody(bulkActionsBodySchema), async (req: Request, res: Response) => {
  try {
    await handleBulkAction(req, res, 'job_id');
  } catch (err) {
    logger.warn('POST /api/orders/bulk-actions failed', { err });
    sendError(res, ERRORS.badRequest);
  }
});

export default router;
