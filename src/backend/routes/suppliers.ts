import { Router, Request, Response } from "express";
import {
  getSuppliers,
  getSupplierById,
  getSupplierPerformance,
} from "../services/suppliers.js";

const router = Router();

// GET /api/suppliers
router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit as string), 1000)
      : 20;
    const offset = req.query.offset
      ? Math.max(parseInt(req.query.offset as string), 0)
      : 0;

    const data = await getSuppliers({ limit, offset });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

// GET /api/suppliers/:id/performance - MUST come before /:id
router.get("/:id/performance", async (req: Request, res: Response) => {
  try {
    const supplier = await getSupplierById(req.params.id);
    if (!supplier) {
      return res
        .status(404)
        .json({ error: "Supplier not found", code: "NOT_FOUND" });
    }

    const performance = await getSupplierPerformance(req.params.id);
    res.json(performance);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

// GET /api/suppliers/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const supplier = await getSupplierById(req.params.id);
    if (!supplier) {
      return res
        .status(404)
        .json({ error: "Supplier not found", code: "NOT_FOUND" });
    }
    res.json(supplier);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

export default router;
