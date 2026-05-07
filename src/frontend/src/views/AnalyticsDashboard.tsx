import { useEffect, useState } from "react";
import { apiClient } from "../api";
import { OrderStats } from "../types";
import { formatCurrency, formatNumber, formatPercent } from "../utils";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface AnalyticsDashboardProps {
  onViewSupplier: (supplierId: string) => void;
}

export default function AnalyticsDashboard({
  onViewSupplier,
}: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getOrderStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading analytics...</p>
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

  if (!stats) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <h3>No data available</h3>
      </div>
    );
  }

  // Prepare chart data
  const statusData = Object.entries(stats.by_status).map(([status, data]) => ({
    name: status,
    value: data.count,
  }));

  const monthlyData = (stats.by_month || []).map((entry) => ({
    month: entry.month,
    count: entry.order_count,
  }));

  const warehouseData = (stats.by_warehouse || []).map((entry) => ({
    name: entry.warehouse,
    value: entry.count,
  }));

  const suppliersData = (stats.top_suppliers || []).map((s) => ({
    supplier_id: s.supplier_id,
    supplier_name: s.supplier_name,
    revenue: s.total_revenue,
  }));

  const COLORS = [
    "#3498db",
    "#27ae60",
    "#e74c3c",
    "#f39c12",
    "#9b59b6",
    "#1abc9c",
    "#e67e22",
    "#34495e",
  ];

  return (
    <div>
      {/* Summary Cards */}
      <div className="summary-cards">
        <div className="summary-card">
          <div className="summary-card-label">Total Orders</div>
          <div className="summary-card-value">
            {formatNumber(stats.total_orders)}
          </div>
        </div>
        <div className="summary-card revenue">
          <div className="summary-card-label">Total Revenue</div>
          <div className="summary-card-value">
            {formatCurrency(stats.total_revenue)}
          </div>
        </div>
        <div className="summary-card average">
          <div className="summary-card-label">Average Order Value</div>
          <div className="summary-card-value">
            {formatCurrency(stats.avg_order_value)}
          </div>
        </div>
      </div>

      {/* Monthly Trend */}
      {monthlyData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Monthly Order Volume</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
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
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* Status Distribution */}
        {statusData.length > 0 ? (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Orders by Status</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${formatNumber(entry.value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <p>No status data available</p>
            </div>
          </div>
        )}

        {/* Warehouse Distribution */}
        {warehouseData.length > 0 ? (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Orders by Warehouse</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={warehouseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
                <Tooltip
                  formatter={(value) => formatNumber(value as number)}
                />
                <Bar dataKey="value" fill="#3498db" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="card">
            <div className="empty-state" style={{ padding: "40px 20px" }}>
              <p>No warehouse data available</p>
            </div>
          </div>
        )}
      </div>

      {/* Top Suppliers */}
      {suppliersData.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Top Suppliers by Revenue</h3>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={suppliersData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" formatter={(value) => formatCurrency(value as number)} />
              <YAxis dataKey="supplier_name" type="category" width={190} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Bar dataKey="revenue" fill="#27ae60" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>

          {/* Supplier details table */}
          <div style={{ marginTop: "20px" }}>
            <table>
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {suppliersData.map((supplier) => (
                  <tr key={supplier.supplier_id}>
                    <td>
                      <button
                        onClick={() => onViewSupplier(supplier.supplier_id)}
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
                        {supplier.supplier_name}
                      </button>
                    </td>
                    <td>{formatCurrency(supplier.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
