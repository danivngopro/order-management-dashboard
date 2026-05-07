import { useEffect, useState } from "react";
import { apiClient } from "../api";
import { Supplier } from "../types";
import { formatCurrency, formatNumber } from "../utils";

interface SuppliersTableProps {
  onViewSupplier: (supplierId: string) => void;
}

export default function SuppliersTable({
  onViewSupplier,
}: SuppliersTableProps) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadSuppliers();
  }, [limit, offset, searchTerm]);

  async function loadSuppliers() {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.getSuppliers({
        limit,
        offset,
      });
      let filtered = result.data;

      // Filter by search term
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (s) =>
            s.name.toLowerCase().includes(term) ||
            s.email.toLowerCase().includes(term) ||
            s.country.toLowerCase().includes(term),
        );
      }

      setSuppliers(filtered);
      setTotal(result.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  }

  const handlePageChange = (newOffset: number) => {
    setOffset(Math.max(0, newOffset));
  };

  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading suppliers...</p>
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

  return (
    <div>
      {/* Filter */}
      <div className="filters">
        <div className="filters-row">
          <div className="filter-group" style={{ minWidth: "250px" }}>
            <label>Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, email, or country..."
            />
          </div>
          {searchTerm && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setSearchTerm("")}
              style={{ alignSelf: "flex-end" }}
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {suppliers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <h3>No suppliers found</h3>
          <p>Try adjusting your search or check back later</p>
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Supplier Name</th>
                <th>Email</th>
                <th>Country</th>
                <th>Rating</th>
                <th>Orders</th>
                <th>Revenue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>
                    <button
                      onClick={() => onViewSupplier(supplier.id)}
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
                      {supplier.name}
                    </button>
                  </td>
                  <td style={{ fontSize: "13px", color: "#666" }}>
                    {supplier.email}
                  </td>
                  <td>{supplier.country}</td>
                  <td>
                    <div style={{ fontSize: "16px", color: "#f39c12" }}>
                      ★ {supplier.rating.toFixed(1)}
                    </div>
                  </td>
                  <td>{formatNumber(supplier.order_count || 0)}</td>
                  <td>{formatCurrency(supplier.total_revenue || 0)}</td>
                  <td>
                    <span
                      className={`badge ${
                        supplier.active ? "approved" : "rejected"
                      }`}
                    >
                      {supplier.active ? "Active" : "Inactive"}
                    </span>
                  </td>
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
    </div>
  );
}
