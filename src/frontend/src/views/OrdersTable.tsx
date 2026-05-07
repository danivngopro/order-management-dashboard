import { useEffect, useState } from "react";
import { apiClient } from "../api";
import { Order, OrderStatus, OrderPriority, Supplier } from "../types";
import BulkProgressModal from "../components/BulkProgressModal";
import BulkActionModal from "../components/BulkActionModal";
import { formatCurrency, formatDate, formatNumber, formatWarehouse } from "../utils";

interface OrdersTableProps {
  onViewSupplier: (supplierId: string) => void;
}

export default function OrdersTable({ onViewSupplier }: OrdersTableProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters
  const [filters, setFilters] = useState({
    status: "",
    priority: "",
    supplier_id: "",
    warehouse: "",
    date_from: "",
    date_to: "",
    search: "",
  });

  // Sorting
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter options
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");

  // Bulk action state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkAction, setBulkAction] = useState<
    "approve" | "reject" | "flag" | null
  >(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<
    "processing" | "completed" | "failed" | null
  >(null);
  const [jobProgress, setJobProgress] = useState({
    total: 0,
    completed: 0,
    failed: 0,
  });

  // Load orders
  useEffect(() => {
    loadOrders();
  }, [limit, offset, filters, sortBy, sortOrder]);

  // Load suppliers and warehouses on mount
  useEffect(() => {
    loadSuppliers();
    loadWarehouses();
  }, []);

  async function loadOrders() {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.getOrders({
        limit,
        offset,
        status: filters.status,
        priority: filters.priority,
        supplier_id: filters.supplier_id,
        warehouse: filters.warehouse,
        date_from: filters.date_from,
        date_to: filters.date_to,
        search: filters.search,
        sort: sortBy,
        order: sortOrder,
      });
      setOrders(result.data);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  async function loadSuppliers() {
    try {
      setSuppliersLoading(true);
      const result = await apiClient.getSuppliers({ limit: 500 });
      setSuppliers(result.data);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    } finally {
      setSuppliersLoading(false);
    }
  }

  async function loadWarehouses() {
    try {
      const stats = await apiClient.getOrderStats();
      const warehouseList = Array.from(new Set((stats.by_warehouse || []).map((w) => w.warehouse).filter(Boolean))).sort();
      setWarehouses(warehouseList);
    } catch (err) {
      console.error("Failed to load warehouses:", err);
    }
  }

  // Poll job status
  useEffect(() => {
    if (!jobId || jobStatus === "completed" || jobStatus === "failed") {
      return;
    }

    const timer = setInterval(async () => {
      try {
        const job = await apiClient.getJobStatus(jobId);
        setJobStatus(job.status);
        setJobProgress(job.progress);
      } catch (err) {
        console.error("Failed to poll job:", err);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [jobId, jobStatus]);

  // Reload orders after bulk action completes
  useEffect(() => {
    if (jobStatus === "completed") {
      setTimeout(() => {
        loadOrders();
      }, 1000);
    }
  }, [jobStatus]);

  const handleFilterChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setOffset(0);
  };

  const handleClearFilters = () => {
    setFilters({
      status: "",
      priority: "",
      supplier_id: "",
      warehouse: "",
      date_from: "",
      date_to: "",
      search: "",
    });
    setSupplierSearch("");
    setOffset(0);
    setSortBy("created_at");
    setSortOrder("desc");
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
    }
    setOffset(0);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action: "approve" | "reject" | "flag") => {
    if (selectedIds.size === 0) return;
    setBulkAction(action);
    setShowBulkModal(true);
  };

  const confirmBulkAction = async (reason?: string) => {
    if (!bulkAction || selectedIds.size === 0) return;

    try {
      setShowBulkModal(false);
      const result = await apiClient.bulkAction({
        orderIds: Array.from(selectedIds),
        action: bulkAction,
        reason,
      });
      setJobId(result.jobId);
      setJobStatus("processing");
      setJobProgress({ total: selectedIds.size, completed: 0, failed: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed");
      setJobStatus(null);
      setJobId(null);
    }
  };

  const handlePageChange = (newOffset: number) => {
    setOffset(Math.max(0, newOffset));
    setSelectedIds(new Set());
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (jobStatus === "processing" || jobStatus === "completed") {
    return (
      <BulkProgressModal
        action={bulkAction!}
        progress={jobProgress}
        status={jobStatus}
        onClose={() => {
          setJobId(null);
          setJobStatus(null);
          setBulkAction(null);
          setSelectedIds(new Set());
        }}
      />
    );
  }

  return (
    <div>
      {error && (
        <div className="error">
          <div className="error-icon">⚠️</div>
          <h3>Error</h3>
          <p>{error}</p>
        </div>
      )}

      {!error && (
        <>
          {/* Filters */}
          <div className="filters">
            <div className="filters-row">
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) =>
                    handleFilterChange("priority", e.target.value)
                  }
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div className="filter-group filter-wide">
                <label>Supplier</label>
                <input
                  list="supplier-options"
                  value={supplierSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSupplierSearch(value);
                    const match = suppliers.find(
                      (s) => s.name === value || s.id === value,
                    );
                    handleFilterChange("supplier_id", match ? match.id : "");
                  }}
                  placeholder={suppliersLoading ? "Loading suppliers..." : "Search supplier by name"}
                  disabled={suppliersLoading}
                />
                <datalist id="supplier-options">
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.name}>
                      {supplier.id}
                    </option>
                  ))}
                </datalist>
              </div>

              <div className="filter-group">
                <label>Warehouse</label>
                <select
                  value={filters.warehouse}
                  onChange={(e) =>
                    handleFilterChange("warehouse", e.target.value)
                  }
                >
                  <option value="">All Warehouses</option>
                  {warehouses.map((warehouse) => (
                    <option key={warehouse} value={warehouse}>
                      {formatWarehouse(warehouse)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="filters-row">
              <div className="filter-group">
                <label>Date From</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) =>
                    handleFilterChange("date_from", e.target.value)
                  }
                />
              </div>

              <div className="filter-group">
                <label>Date To</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) =>
                    handleFilterChange("date_to", e.target.value)
                  }
                />
              </div>

              <div className="filter-group">
                <label>Search</label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  placeholder="Search orders"
                />
              </div>

              <div className="filter-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleClearFilters}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Bulk actions toolbar */}
          {selectedIds.size > 0 && (
            <div className="card">
              <div style={{ marginBottom: "12px" }}>
                <strong>{selectedIds.size} orders selected</strong>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => handleBulkAction("approve")}
                >
                  ✓ Approve
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleBulkAction("reject")}
                >
                  ✗ Reject
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleBulkAction("flag")}
                >
                  🚩 Flag
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <h3>No orders found</h3>
              <p>Try adjusting your filters or check back later</p>
            </div>
          ) : (
            <div className="card">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: "40px" }}>
                      <label className="checkbox-wrapper">
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.size === orders.length &&
                            orders.length > 0
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </label>
                    </th>
                    <th onClick={() => handleSort("id")}>
                      ID{" "}
                      {sortBy === "id" ? (sortOrder === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th>Supplier</th>
                    <th>Product</th>
                    <th onClick={() => handleSort("quantity")}>
                      Qty{" "}
                      {sortBy === "quantity"
                        ? sortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th onClick={() => handleSort("total_price")}>
                      Total{" "}
                      {sortBy === "total_price"
                        ? sortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th onClick={() => handleSort("created_at")}>
                      Created{" "}
                      {sortBy === "created_at"
                        ? sortOrder === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                    <th>Warehouse</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <label className="checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(order.id)}
                            onChange={(e) =>
                              handleSelectRow(order.id, e.target.checked)
                            }
                          />
                        </label>
                      </td>
                      <td style={{ fontSize: "13px", color: "#666" }}>
                        {order.id}
                      </td>
                      <td>
                        <button
                          onClick={() => onViewSupplier(order.supplier_id)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#3498db",
                            cursor: "pointer",
                            textDecoration: "underline",
                            padding: 0,
                            font: "inherit",
                          }}
                        >
                          {order.supplier_name || order.supplier_id}
                        </button>
                      </td>
                      <td>{order.product_name || order.product_id}</td>
                      <td>{formatNumber(order.quantity)}</td>
                      <td>{formatCurrency(order.total_price)}</td>
                      <td>
                        <span className={`badge ${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${order.priority}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td style={{ fontSize: "13px" }}>
                        {formatDate(order.created_at)}
                      </td>
                      <td>{formatWarehouse(order.warehouse)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="pagination">
                <button
                  onClick={() => handlePageChange(offset - limit)}
                  disabled={offset === 0}
                >
                  ← Previous
                </button>
                <span className="pagination-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(offset + limit)}
                  disabled={offset + limit >= total}
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Bulk action confirmation modal */}
          {showBulkModal && (
            <BulkActionModal
              action={bulkAction!}
              count={selectedIds.size}
              onConfirm={confirmBulkAction}
              onCancel={() => setShowBulkModal(false)}
            />
          )}
        </>
      )}
    </div>
  );
}
