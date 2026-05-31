// src/Components/Order/Order.js
import React, { useEffect, useMemo, useState } from "react";
import "./Order.css";
import Sidebar from "../Sidebar/Sidebaris";

/* Demo orders (you can replace with API later) */
const ORDERS = [
  { id: 10000, customer: "Janiru Dulkith",    status: "Completed",  total: 3500, date: "Sep 10" },
  { id: 10001, customer: "Pahasara Liyanage",  status: "Cancelled",  total: 3850, date: "Sep 15" },
  { id: 10002, customer: "Pahasara Perera",    status: "Cancelled",  total: 2500, date: "Sep 18" },
];

const money = (n) => "LKR " + Number(n ?? 0).toLocaleString("en-LK");
const statusClass = (s = "") => {
  const k = s.toLowerCase();
  if (k === "completed") return "completed";
  if (k === "processing") return "processing";
  if (k === "cancelled" || k === "canceled") return "cancelled";
  return "";
};

// 👉 helper to read customers that UserManagement saved
function getStoredCustomers() {
  try {
    const raw = localStorage.getItem("packpal_customers");
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((c) => c && (c.name || c.email));
  } catch {
    return [];
  }
}

export default function Orders() {
  const [q, setQ] = useState("");
  const [customers, setCustomers] = useState([]);      // from localStorage
  const [customerFilter, setCustomerFilter] = useState("All"); // dropdown filter

  // Load customers from localStorage; if empty, fallback to names in ORDERS
  useEffect(() => {
    const stored = getStoredCustomers();
    if (stored.length > 0) {
      setCustomers(stored);
    } else {
      // fallback unique names from orders
      const uniq = Array.from(new Set(ORDERS.map((o) => o.customer))).map((name, i) => ({
        _id: `fallback-${i}`,
        name,
        email: "",
        status: "active",
      }));
      setCustomers(uniq);
    }
  }, []);

  // Text + customer dropdown filtering
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ORDERS.filter((o) => {
      const idMatch = String(o.id).toLowerCase().includes(query);
      const nameMatch = (o.customer || "").toLowerCase().includes(query);
      const textOk = !query || idMatch || nameMatch;

      const custOk =
        customerFilter === "All" ||
        (o.customer || "").toLowerCase() === customerFilter.toLowerCase();

      return textOk && custOk;
    });
  }, [q, customerFilter]);

  // Quick counts based on filtered list (or you can compute from all)
  const newOrdersCount = 1;
  const processingCount = 0;
  const completedCount = 1;

  return (
    <div className="orders">{/* page wrapper to scope styles */}
      <Sidebar />

      <div className="orders-page">
        <h1 className="page-title">Orders</h1>

        {/* Stats */}
        <section className="stats">
          <article className="stat-card">
            <p className="stat-label">New Orders</p>
            <p className="stat-value" id="newCount">{newOrdersCount}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Processing</p>
            <p className="stat-value" id="processingCount">{processingCount}</p>
          </article>
          <article className="stat-card">
            <p className="stat-label">Completed</p>
            <p className="stat-value" id="completedCount">{completedCount}</p>
          </article>
        </section>

        {/* Lightweight customer panel */}
        <section className="table-card" aria-labelledby="recentOrdersHeading">
          <div className="table-head">
            <h2 id="recentOrdersHeading">Recent Orders</h2>

            <div className="table-tools" style={{ display: "flex", gap: 10 }}>
              <label className="search">
                <input
                  type="search"
                  placeholder="Search order # or customer"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>

              {/* Customer filter fed from UserManagement's saved customers */}
              <select
                className="customer-filter"
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                aria-label="Filter by customer"
              >
                <option value="All">All Customers</option>
                {customers.map((c) => (
                  <option key={c._id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="table-wrap">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="empty" colSpan={5}>No orders found</td>
                  </tr>
                ) : (
                  filtered.map((o) => (
                    <tr key={o.id}>
                      <td className="order-id">#{o.id}</td>
                      <td>
                        {/* Click the name to filter by that customer quickly */}
                        <button
                          className="linklike"
                          onClick={() => setCustomerFilter(o.customer || "All")}
                          title="Filter by this customer"
                          style={{
                            background: "none",
                            border: "none",
                            padding: 0,
                            color: "inherit",
                            cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          {o.customer}
                        </button>
                      </td>
                      <td>
                        <span className={`status ${statusClass(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td>{money(o.total)}</td>
                      <td>{o.date}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
