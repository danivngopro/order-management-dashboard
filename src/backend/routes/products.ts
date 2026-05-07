import { Router, Request, Response } from 'express';
import { getProducts } from '../services/products.js';
import { listProductsQuerySchema, ListProductsQuery } from '../schemas/products.js';
import { getValidatedQuery, validateQuery } from '../utils/validate.js';
import { ERRORS, sendError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/products
router.get('/', validateQuery(listProductsQuerySchema), async (req: Request, res: Response) => {
  try {
    const query = getValidatedQuery<ListProductsQuery>(req);
    const data = await getProducts(query);
    res.json(data);
  } catch (err) {
    logger.error('GET /api/products failed', { err });
    sendError(res, ERRORS.internalError);
  }
});

export default router;
