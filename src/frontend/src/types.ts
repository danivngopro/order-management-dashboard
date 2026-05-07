// Data types matching backend API responses

export type OrderStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "shipped"
  | "delivered"
  | "cancelled";
export type OrderPriority = "low" | "medium" | "high" | "critical";

export interface Order {
  id: string;
  supplier_id: string;
  product_id: string;
  supplier_name?: string;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: OrderStatus;
  priority: OrderPriority;
  created_at: string;
  updated_at: string;
  warehouse?: string | null;
  notes?: string | null;
  version?: number;
}

export interface Supplier {
  id: string;
  name: string;
  email: string;
  rating: number;
  country: string;
  active: boolean;
  created_at: string;
  order_count?: number;
  total_revenue?: number;
}

export interface SupplierPerformance {
  avg_delivery_days: number;
  rejection_rate: number;
  avg_order_value: number;
  price_consistency: number;
  monthly_trend: Array<{
    month: string;
    order_count: number;
  }>;
}

export interface Product {
  id: string;
  name: string;
  category_id: string;
  sku: string;
  price: number;
}

export interface OrderStats {
  total_orders: number;
  total_revenue: number;
  avg_order_value: number;
  by_status: Record<
    OrderStatus,
    {
      count: number;
      total_value: number;
    }
  >;
  by_month: Array<{
    month: string;
    order_count: number;
    revenue: number;
  }>;
  top_suppliers: Array<{
    supplier_id: string;
    supplier_name: string;
    total_revenue: number;
  }>;
  by_warehouse: Array<{
    warehouse: string;
    count: number;
    total_value: number;
  }>;
}

export interface BulkActionJob {
  jobId?: string;
  status: "processing" | "completed" | "failed";
  progress: {
    total: number;
    completed: number;
    failed: number;
  };
  errors?: Array<{
    orderId: string;
    error: string;
  }>;
}

export interface ApiResponse<T> {
  data: T;
  total?: number;
  limit?: number;
  offset?: number;
}

export interface ApiError {
  error: string;
  code?: string;
}
