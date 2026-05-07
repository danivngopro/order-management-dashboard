import {
  Order,
  OrderStatus,
  Supplier,
  SupplierPerformance,
  Product,
  OrderStats,
  BulkActionJob,
  ApiResponse,
  ApiError,
} from "./types";

const API_BASE = "/api";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = await response.json();
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const apiClient = {
  // Orders
  async getOrders(params: {
    limit?: number;
    offset?: number;
    status?: string;
    priority?: string;
    supplier_id?: string;
    warehouse?: string;
    date_from?: string;
    date_to?: string;
    search?: string;
    sort?: string;
    order?: string;
  }): Promise<ApiResponse<Order[]>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        query.append(key, String(value));
      }
    });
    const response = await fetch(`${API_BASE}/orders?${query.toString()}`);
    return handleResponse<ApiResponse<Order[]>>(response);
  },

  async getOrderById(id: string): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders/${id}`);
    return handleResponse<Order>(response);
  },

  async updateOrder(
    id: string,
    updates: {
      status?: OrderStatus;
      priority?: string;
      notes?: string;
    },
  ): Promise<Order> {
    const response = await fetch(`${API_BASE}/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return handleResponse<Order>(response);
  },

  // Suppliers
  async getSuppliers(params: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Supplier[]>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
    const response = await fetch(`${API_BASE}/suppliers?${query.toString()}`);
    return handleResponse<ApiResponse<Supplier[]>>(response);
  },

  async getSupplierById(id: string): Promise<Supplier> {
    const response = await fetch(`${API_BASE}/suppliers/${id}`);
    return handleResponse<Supplier>(response);
  },

  async getSupplierPerformance(id: string): Promise<SupplierPerformance> {
    const response = await fetch(`${API_BASE}/suppliers/${id}/performance`);
    return handleResponse<SupplierPerformance>(response);
  },

  // Products
  async getProducts(params: {
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<Product[]>> {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.append(key, String(value));
    });
    const response = await fetch(`${API_BASE}/products?${query.toString()}`);
    return handleResponse<ApiResponse<Product[]>>(response);
  },

  // Stats & Analytics
  async getOrderStats(): Promise<OrderStats> {
    const response = await fetch(`${API_BASE}/orders/stats`);
    return handleResponse<OrderStats>(response);
  },

  // Bulk Actions
  async bulkAction(payload: {
    orderIds: string[];
    action: "approve" | "reject" | "flag";
    reason?: string;
  }): Promise<{ jobId: string }> {
    const response = await fetch(`${API_BASE}/orders/bulk-action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ jobId: string }>(response);
  },

  async getJobStatus(jobId: string): Promise<BulkActionJob> {
    const response = await fetch(`${API_BASE}/jobs/${jobId}`);
    return handleResponse<BulkActionJob>(response);
  },
};
