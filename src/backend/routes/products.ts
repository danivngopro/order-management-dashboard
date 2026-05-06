import { Router, Request, Response } from "express";
import { getProducts } from "../services/products.js";

const router = Router();

// GET /api/products
router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit as string), 1000)
      : 20;
    const offset = req.query.offset
      ? Math.max(parseInt(req.query.offset as string), 0)
      : 0;
    const category = req.query.category as string;

    const data = await getProducts({ limit, offset, category });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

export default router;
