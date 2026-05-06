import { Router, Request, Response } from "express";
import {
  getOrders,
  getOrderById,
  patchOrder,
  getOrderStats,
} from "../services/orders.js";
import { getAnomalies } from "../services/anomalies.js";
import { createBulkJob, getBulkJob } from "../services/bulk.js";
import { sseManager } from "../realtime/sse.js";

const router = Router();

// GET /api/orders/stats - MUST come before /:id
router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await getOrderStats();
    res.json(stats);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

// GET /api/orders/anomalies - MUST come before /:id
router.get("/anomalies", async (req: Request, res: Response) => {
  try {
    const anomalies = await getAnomalies();
    res.json({ data: anomalies });
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

// GET /api/orders
router.get("/", async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit
      ? Math.min(parseInt(req.query.limit as string), 1000)
      : 20;
    const offset = req.query.offset
      ? Math.max(parseInt(req.query.offset as string), 0)
      : 0;

    const data = await getOrders({
      limit,
      offset,
      status: req.query.status as string,
      priority: req.query.priority as string,
      supplier_id: req.query.supplier_id as string,
      warehouse: req.query.warehouse as string,
      date_from: req.query.date_from as string,
      date_to: req.query.date_to as string,
      min_total: req.query.min_total
        ? parseFloat(req.query.min_total as string)
        : undefined,
      search: req.query.search as string,
      sort: req.query.sort as string,
      order: req.query.order as string,
    });

    res.json(data);
  } catch (err: any) {
    console.error("GET /api/orders error:", err);
    res.status(400).json({ error: err.message, code: "BAD_REQUEST" });
  }
});

// GET /api/orders/:id
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const order = await getOrderById(req.params.id);
    if (!order) {
      return res
        .status(404)
        .json({ error: "Order not found", code: "NOT_FOUND" });
    }
    res.json(order);
  } catch (err: any) {
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

// PATCH /api/orders/:id
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { status, priority, notes } = req.body;

    // Validate status if provided
    const VALID_STATUSES = [
      "pending",
      "approved",
      "rejected",
      "shipped",
      "delivered",
      "cancelled",
    ];
    if (status && !VALID_STATUSES.includes(status)) {
      return res
        .status(400)
        .json({ error: "Invalid status", code: "INVALID_STATUS" });
    }

    // Validate priority if provided
    const VALID_PRIORITIES = ["low", "medium", "high", "critical"];
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res
        .status(400)
        .json({ error: "Invalid priority", code: "INVALID_PRIORITY" });
    }

    const result = await patchOrder(req.params.id, { status, priority, notes });

    if (result.error === "Order is being updated") {
      return res
        .status(409)
        .json({ error: "Order is being updated", code: "CONFLICT" });
    }
    if (result.error === "Order not found") {
      return res
        .status(404)
        .json({ error: "Order not found", code: "NOT_FOUND" });
    }
    if (result.error === "Order is cancelled") {
      return res
        .status(409)
        .json({ error: "Order is cancelled", code: "CONFLICT" });
    }
    if (
      result.error === "Invalid status" ||
      result.error === "Invalid priority"
    ) {
      return res
        .status(400)
        .json({ error: result.error, code: "INVALID_VALUE" });
    }

    // Emit SSE event if status changed
    if (status && result.order) {
      sseManager.broadcastToSupplier(result.order.supplier_id, {
        type: "order_updated",
        data: {
          id: result.order.id,
          old_status: req.body.oldStatus || "unknown",
          new_status: status,
          updated_at: result.order.updated_at,
        },
      });
    }

    res.json(result.order);
  } catch (err: any) {
    console.error("PATCH /api/orders/:id error:", err);
    res.status(500).json({ error: err.message, code: "INTERNAL_ERROR" });
  }
});

// POST /api/orders/bulk-action
router.post("/bulk-action", async (req: Request, res: Response) => {
  try {
    const { orderIds, action, reason } = req.body;

    if (!orderIds || orderIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Empty orderIds", code: "INVALID_INPUT" });
    }
    if (orderIds.length > 10000) {
      return res
        .status(400)
        .json({ error: "Too many order IDs", code: "TOO_MANY" });
    }
    if (!["approve", "reject", "flag"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Invalid action", code: "INVALID_ACTION" });
    }

    const jobId = await createBulkJob(orderIds, action, reason);
    res.status(202).json({ jobId });
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: "BAD_REQUEST" });
  }
});

// POST /api/orders/bulk (same as bulk-action)
router.post("/bulk", async (req: Request, res: Response) => {
  try {
    const { orderIds, action, reason } = req.body;

    if (!orderIds || orderIds.length === 0) {
      return res
        .status(400)
        .json({ error: "Empty orderIds", code: "INVALID_INPUT" });
    }
    if (orderIds.length > 10000) {
      return res
        .status(400)
        .json({ error: "Too many order IDs", code: "TOO_MANY" });
    }
    if (!["approve", "reject", "flag"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Invalid action", code: "INVALID_ACTION" });
    }

    const jobId = await createBulkJob(orderIds, action, reason);
    res.status(202).json({ jobId });
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: "BAD_REQUEST" });
  }
});

// POST /api/orders/bulk-actions
router.post("/bulk-actions", async (req: Request, res: Response) => {
  try {
    const { order_ids, action, reason } = req.body;

    if (!order_ids || order_ids.length === 0) {
      return res
        .status(400)
        .json({ error: "Empty order_ids", code: "INVALID_INPUT" });
    }
    if (order_ids.length > 10000) {
      return res
        .status(400)
        .json({ error: "Too many order IDs", code: "TOO_MANY" });
    }
    if (!["approve", "reject", "flag"].includes(action)) {
      return res
        .status(400)
        .json({ error: "Invalid action", code: "INVALID_ACTION" });
    }

    const job_id = await createBulkJob(order_ids, action, reason);
    res.status(202).json({ job_id });
  } catch (err: any) {
    res.status(400).json({ error: err.message, code: "BAD_REQUEST" });
  }
});

export default router;
