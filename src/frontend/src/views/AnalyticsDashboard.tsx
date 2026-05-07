import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../api";
import { OrderStats } from "../types";
import {
  formatCompactCurrency,
  formatCurrency,
  formatNumber,
  formatWarehouse,
  toNumber,
} from "../utils";
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

function ChartEmpty({ label }: { label: string }) {
  return (
    <div className="empty-state chart-empty">
      <div className="empty-state-icon">📊</div>
      <p>{label}</p>
    </div>
  );
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

  const chartData = useMemo(() => {
    if (!stats) {
      return {
        statusData: [],
        monthlyData: [],
        warehouseData: [],
        suppliersData: [],
      };
    }

    const statusData = Object.entries(stats.by_status || {}).map(
      ([status, values]) => ({
        status,
        count: toNumber(values?.count),
        totalValue: toNumber(values?.total_value),
      }),
    );

    const monthlyData = (stats.by_month || []).map((entry) => ({
      month: entry.month,
      orders: toNumber(entry.order_count),
      revenue: toNumber(entry.revenue),
    }));

    const warehouseData = (stats.by_warehouse || []).map((entry) => ({
      warehouse: formatWarehouse(entry.warehouse),
      rawWarehouse: entry.warehouse,
      orders: toNumber(entry.count),
      revenue: toNumber(entry.total_value),
    }));

    const suppliersData = (stats.top_suppliers || []).map((supplier) => ({
      supplierId: supplier.supplier_id,
      supplierName: supplier.supplier_name,
      revenue: toNumber(supplier.total_revenue),
    }));

    return { statusData, monthlyData, warehouseData, suppliersData };
  }, [stats]);

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

  const { statusData, monthlyData, warehouseData, suppliersData } = chartData;

  return (
    <div>
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
            {formatCompactCurrency(stats.total_revenue)}
          </div>
        </div>
        <div className="summary-card average">
          <div className="summary-card-label">Average Order Value</div>
          <div className="summary-card-value">
            {formatCurrency(stats.avg_order_value)}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Monthly Order Volume</h3>
        </div>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={monthlyData} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatNumber(value)} />
              <Tooltip
                formatter={(value, name) => [
                  name === "Revenue" ? formatCurrency(value) : formatNumber(value),
                  name,
                ]}
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
          <ChartEmpty label="No monthly order data available" />
        )}
      </div>

      <div className="chart-grid">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Orders by Status</h3>
          </div>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => `${status}: ${formatNumber(count)}`}
                  outerRadius={95}
                  dataKey="count"
                  nameKey="status"
                >
                  {statusData.map((_, index) => (
                    <Cell key={`status-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(value)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No status data available" />
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Orders by Warehouse</h3>
          </div>
          {warehouseData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={warehouseData} margin={{ top: 8, right: 24, left: 8, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="warehouse" angle={-35} textAnchor="end" interval={0} height={70} />
                <YAxis tickFormatter={(value) => formatNumber(value)} />
                <Tooltip
                  formatter={(value, name) => [
                    name === "Revenue" ? formatCurrency(value) : formatNumber(value),
                    name,
                  ]}
                />
                <Bar dataKey="orders" fill="#3498db" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ChartEmpty label="No warehouse data available" />
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Top Suppliers by Revenue</h3>
        </div>
        {suppliersData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart
                data={suppliersData}
                layout="vertical"
                margin={{ top: 5, right: 32, left: 190, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCompactCurrency(value)} />
                <YAxis dataKey="supplierName" type="category" width={180} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="revenue" fill="#27ae60" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>

            <div className="table-scroll" style={{ marginTop: 20 }}>
              <table>
                <thead>
                  <tr>
                    <th>Supplier</th>
                    <th>Total Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliersData.map((supplier) => (
                    <tr key={supplier.supplierId}>
                      <td>
                        <button
                          className="link-button"
                          onClick={() => onViewSupplier(supplier.supplierId)}
                        >
                          {supplier.supplierName}
                        </button>
                      </td>
                      <td>{formatCurrency(supplier.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <ChartEmpty label="No supplier revenue data available" />
        )}
      </div>
    </div>
  );
}
