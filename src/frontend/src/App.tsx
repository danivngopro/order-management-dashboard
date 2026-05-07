import { useState } from "react";
import OrdersTable from "./views/OrdersTable";
import AnalyticsDashboard from "./views/AnalyticsDashboard";
import SuppliersTable from "./views/SuppliersTable";
import SupplierDetail from "./views/SupplierDetail";

type View = "orders" | "analytics" | "suppliers" | "supplier";

function App() {
  const [currentView, setCurrentView] = useState<View>("orders");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );

  const handleViewSupplier = (supplierId: string) => {
    setSelectedSupplierId(supplierId);
    setCurrentView("supplier");
  };

  const handleBackToOrders = () => {
    setCurrentView("orders");
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <h1>📊 Orders</h1>
        <ul className="nav-links">
          <li>
            <button
              className={`nav-link ${currentView === "orders" ? "active" : ""}`}
              onClick={() => setCurrentView("orders")}
            >
              Orders
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${
                currentView === "analytics" ? "active" : ""
              }`}
              onClick={() => setCurrentView("analytics")}
            >
              Analytics
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${
                currentView === "suppliers" ? "active" : ""
              }`}
              onClick={() => setCurrentView("suppliers")}
            >
              Suppliers
            </button>
          </li>
          {selectedSupplierId && (
            <li>
              <button
                className={`nav-link ${
                  currentView === "supplier" ? "active" : ""
                }`}
                onClick={() => setCurrentView("supplier")}
              >
                Supplier Detail
              </button>
            </li>
          )}
        </ul>
      </aside>

      <main className="main-content">
        {currentView === "orders" && (
          <>
            <header className="header">
              <h2>Procurement Orders</h2>
            </header>
            <div className="content">
              <OrdersTable onViewSupplier={handleViewSupplier} />
            </div>
          </>
        )}

        {currentView === "analytics" && (
          <>
            <header className="header">
              <h2>Analytics Dashboard</h2>
            </header>
            <div className="content">
              <AnalyticsDashboard onViewSupplier={handleViewSupplier} />
            </div>
          </>
        )}

        {currentView === "suppliers" && (
          <>
            <header className="header">
              <h2>Suppliers</h2>
            </header>
            <div className="content">
              <SuppliersTable onViewSupplier={handleViewSupplier} />
            </div>
          </>
        )}

        {currentView === "supplier" && selectedSupplierId && (
          <>
            <header className="header">
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleBackToOrders}
              >
                ← Back
              </button>
            </header>
            <div className="content">
              <SupplierDetail supplierId={selectedSupplierId} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
