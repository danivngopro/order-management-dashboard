import { useEffect, useState } from "react";
import { apiClient } from "../api";
import { Supplier, SupplierPerformance, Order } from "../types";
import { formatCurrency, formatNumber, formatPercent } from "../utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface SupplierDetailProps {
  supplierId: string;
}

export default function SupplierDetail({ supplierId }: SupplierDetailProps) {
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [performance, setPerformance] = useState<SupplierPerformance | null>(
    null,
  );
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSupplierData();
  }, [supplierId]);

  async function loadSupplierData() {
    try {
      setLoading(true);
      setError(null);

      const [supplierData, performanceData, ordersData] = await Promise.all([
        apiClient.getSupplierById(supplierId),
        apiClient.getSupplierPerformance(supplierId),
        apiClient.getOrders({
          supplier_id: supplierId,
          limit: 100,
        }),
      ]);

      setSupplier(supplierData);
      setPerformance(performanceData);
      setOrders(ordersData.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load supplier");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading supplier details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <div className="error-icon">⚠️</div>
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">👤</div>
        <h3>Supplier not found</h3>
      </div>
    );
  }

  return (
    <div>
      {/* Supplier Header */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "start",
          }}
        >
          <div>
            <h2 style={{ fontSize: "24px", marginBottom: "8px" }}>
              {supplier.name}
            </h2>
            <p style={{ color: "#666", marginBottom: "4px" }}>
              📧 {supplier.email}
            </p>
            <p style={{ color: "#666", marginBottom: "4px" }}>
              🌍 {supplier.country}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#f39c12",
                marginBottom: "4px",
              }}
            >
              ★ {supplier.rating}
            </div>
            <div>
              <span
                className={`badge ${supplier.active ? "approved" : "rejected"}`}
              >
                {supplier.active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Summary */}
      {performance && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-label">Total Orders</div>
            <div className="summary-card-value">
              {formatNumber(supplier.order_count || 0)}
            </div>
          </div>
          <div className="summary-card revenue">
            <div className="summary-card-label">Total Revenue</div>
            <div className="summary-card-value">
              {formatCurrency(supplier.total_revenue || 0)}
            </div>
          </div>
          <div className="summary-card average">
            <div className="summary-card-label">Avg Order Value</div>
            <div className="summary-card-value">
              {formatCurrency(performance.avg_order_value)}
            </div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performance && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div className="card">
            <div className="summary-card-label">Avg Delivery Days</div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#3498db",
                marginTop: "8px",
              }}
            >
              {performance.avg_delivery_days.toFixed(1)}
            </div>
          </div>
          <div className="card">
            <div className="summary-card-label">Rejection Rate</div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#e74c3c",
                marginTop: "8px",
              }}
            >
              {formatPercent(performance.rejection_rate)}
            </div>
          </div>
          <div className="card">
            <div className="summary-card-label">Price Consistency</div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: "bold",
                color: "#27ae60",
                marginTop: "8px",
              }}
            >
              {formatPercent(performance.price_consistency)}
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trend */}
      {performance && performance.monthly_trend && performance.monthly_trend.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Order Volume Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={performance.monthly_trend.map((entry: any) => ({
                month: entry.month,
                count: entry.order_count,
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip
                formatter={(value) => formatNumber(value as number)}
                labelFormatter={(label) => `Month: ${label}`}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3498db"
                strokeWidth={2}
                dot={{ r: 4 }}
                name="Orders"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        performance && (
          <div className="card">
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <p>No trend data available</p>
            </div>
          </div>
        )
      )}

      {/* Orders Table */}
      {orders.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Order History ({orders.length})</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Product</th>
                <th>Quantity</th>
                <th>Unit Price</th>
                <th>Total</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontSize: "13px", color: "#666" }}>
                    {order.id}
                  </td>
                  <td>{order.product_name || order.product_id}</td>
                  <td>{order.quantity}</td>
                  <td>{formatCurrency(order.unit_price)}</td>
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
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {orders.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>No orders found</h3>
          <p>This supplier has no orders in the system.</p>
        </div>
      )}
    </div>
  );
}
