import { Router, Request, Response } from 'express';
import { getSuppliers, getSupplierById, getSupplierPerformance } from '../services/suppliers.js';
import { idParamSchema } from '../schemas/common.js';
import { listSuppliersQuerySchema, ListSuppliersQuery } from '../schemas/suppliers.js';
import {
  getValidatedParams,
  getValidatedQuery,
  validateParams,
  validateQuery,
} from '../utils/validate.js';
import { ERRORS, sendError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/suppliers
router.get('/', validateQuery(listSuppliersQuerySchema), async (req: Request, res: Response) => {
  try {
    const query = getValidatedQuery<ListSuppliersQuery>(req);
    const data = await getSuppliers(query);
    res.json(data);
  } catch (err) {
    logger.error('GET /api/suppliers failed', { err });
    sendError(res, ERRORS.internalError);
  }
});

// GET /api/suppliers/:id/performance - MUST come before /:id
router.get('/:id/performance', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const { id } = getValidatedParams<{ id: string }>(req);
    const supplier = await getSupplierById(id);
    if (!supplier) return sendError(res, ERRORS.supplierNotFound);

    const performance = await getSupplierPerformance(id);
    res.json(performance);
  } catch (err) {
    logger.error('GET /api/suppliers/:id/performance failed', { err });
    sendError(res, ERRORS.internalError);
  }
});

// GET /api/suppliers/:id
router.get('/:id', validateParams(idParamSchema), async (req: Request, res: Response) => {
  try {
    const { id } = getValidatedParams<{ id: string }>(req);
    const supplier = await getSupplierById(id);
    if (!supplier) return sendError(res, ERRORS.supplierNotFound);
    res.json(supplier);
  } catch (err) {
    logger.error('GET /api/suppliers/:id failed', { err });
    sendError(res, ERRORS.internalError);
  }
});

export default router;
