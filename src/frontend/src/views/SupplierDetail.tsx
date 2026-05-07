import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api";
import { Supplier, SupplierPerformance, Order } from "../types";
import { formatCurrency, formatDate, formatNumber, formatPercent, toNumber } from "../utils";
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
  const [performance, setPerformance] = useState<SupplierPerformance | null>(null);
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
        apiClient.getOrders({ supplier_id: supplierId, limit: 100 }),
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

  const monthlyTrend = useMemo(() => {
    return (performance?.monthly_trend || []).map((entry) => ({
      month: entry.month,
      orders: toNumber(entry.order_count),
    }));
  }, [performance]);

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
      <div className="card supplier-header-card">
        <div className="supplier-header-content">
          <div>
            <h2>{supplier.name}</h2>
            <p>📧 {supplier.email}</p>
            <p>🌍 {supplier.country}</p>
            <p className="muted">ID: {supplier.id}</p>
          </div>
          <div className="supplier-rating-block">
            <div className="supplier-rating">★ {toNumber(supplier.rating).toFixed(1)}</div>
            <span className={`badge ${supplier.active ? "approved" : "rejected"}`}>
              {supplier.active ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>

      {performance && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-card-label">Total Orders</div>
            <div className="summary-card-value">{formatNumber(supplier.order_count || 0)}</div>
          </div>
          <div className="summary-card revenue">
            <div className="summary-card-label">Total Revenue</div>
            <div className="summary-card-value">{formatCurrency(supplier.total_revenue || 0)}</div>
          </div>
          <div className="summary-card average">
            <div className="summary-card-label">Avg Order Value</div>
            <div className="summary-card-value">{formatCurrency(performance.avg_order_value)}</div>
          </div>
        </div>
      )}

      {performance && (
        <div className="metric-grid">
          <div className="card metric-card">
            <div className="summary-card-label">Avg Delivery Days</div>
            <div className="metric-value blue">{toNumber(performance.avg_delivery_days).toFixed(1)}</div>
          </div>
          <div className="card metric-card">
            <div className="summary-card-label">Rejection Rate</div>
            <div className="metric-value red">{formatPercent(performance.rejection_rate)}</div>
          </div>
          <div className="card metric-card">
            <div className="summary-card-label">Price Consistency</div>
            <div className="metric-value green">{formatPercent(performance.price_consistency)}</div>
          </div>
        </div>
      )}

      {performance && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Order Volume Trend</h3>
          </div>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={monthlyTrend} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <Tooltip
                  formatter={(value) => formatNumber(value)}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#3498db"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Orders"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state chart-empty">
              <p>No trend data available</p>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Order History ({formatNumber(orders.length)})</h3>
        </div>
        {orders.length > 0 ? (
          <div className="table-scroll">
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
                    <td className="muted small-text">{order.id}</td>
                    <td>{order.product_name || order.product_id}</td>
                    <td>{formatNumber(order.quantity)}</td>
                    <td>{formatCurrency(order.unit_price)}</td>
                    <td>{formatCurrency(order.total_price)}</td>
                    <td><span className={`badge ${order.status}`}>{order.status}</span></td>
                    <td><span className={`badge ${order.priority}`}>{order.priority}</span></td>
                    <td className="small-text">{formatDate(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <h3>No orders found</h3>
            <p>This supplier has no orders in the system.</p>
          </div>
        )}
      </div>
    </div>
  );
}
