import React, { useEffect, useMemo, useRef, useState } from "react";
import Sidebarpul from "../Sidebar/Sidebarpul";
import "./InventoryDashboard.css";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const INVENTORY_PRODUCTS_PATH = "/api/products";   // finished products
const INVENTORY_ITEMS_PATH    = "/api/inventory";  // inventory items/materials

/* ---------- Helpers ---------- */
function statusOf(stock) {
  const n = Number(stock);
  if (Number.isNaN(n)) return "in-stock";
  if (n === 0) return "out-of-stock";
  if (n <= 20) return "low-stock";
  return "in-stock";
}

const money = (n) =>
  "LKR " + Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });

/* ---------- Discount logic (matches ProductInventory) ---------- */
function discountedUnitPrice(p) {
  const base = Number(p.unitPrice || 0);
  const type = String(p.discountType || "").trim().toLowerCase();
  const valRaw = p.discountValue;
  if (valRaw === null || valRaw === undefined) return base;

  const value = Number(valRaw);
  if (!Number.isFinite(value) || value <= 0) return base;

  const isPercent =
    type === "percent" ||
    type === "percentage" ||
    type === "%" ||
    type === "pc" ||
    type === "pct";

  if (isPercent) {
    const pct = Math.max(0, Math.min(100, value));
    return Math.max(0, base * (1 - pct / 100));
  }
  // flat or unknown → treat as flat amount off
  return Math.max(0, base - value);
}

/* ---------- Mappers (defensive to field names) ---------- */
function toUiProduct(item) {
  const name = item.name || item.productName || "Unnamed";
  const category = item.category || "Uncategorized";
  const stock = Number(item.stock ?? item.quantity ?? 0);
  const unitPrice = Number(item.unitPrice ?? item.price ?? 0);

  // include discount fields so dashboard mirrors ProductInventory
  const discountType = item.discountType || "";
  const discountValue = item.discountValue ?? null;

  const p = { name, category, stock, unitPrice, discountType, discountValue };
  return {
    name: String(name),
    category: String(category),
    stock,
    unitPrice,
    discountType,
    discountValue,
    // value uses discounted unit price
    value: stock * discountedUnitPrice(p),
  };
}

function toUiItem(row) {
  const name = row.name || row.itemName || "Item";
  const quantity = Number(row.quantity ?? row.stock ?? 0);
  const unitPrice = Number(row.unitPrice ?? row.price ?? 0);
  return {
    name: String(name),
    quantity,
    unitPrice,
    value: quantity * unitPrice,
  };
}

export default function InventoryDashboard() {
  const [query, setQuery] = useState("");
  const [dateTime, setDateTime] = useState(new Date());
  const [products, setProducts] = useState([]); // finished products
  const [items, setItems] = useState([]);       // inventory items/materials
  const [error, setError] = useState("");
  const canvasRef = useRef(null);

  /* ---- Live clock ---- */
  useEffect(() => {
    const t = setInterval(() => setDateTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const formattedNow = useMemo(
    () =>
      dateTime.toLocaleString(undefined, { dateStyle: "long", timeStyle: "short" }),
    [dateTime]
  );

  /* ---- Fetch both sources ---- */
  useEffect(() => {
    (async () => {
      try {
        setError("");
        const [prodRes, itemRes] = await Promise.allSettled([
          axios.get(`${API_BASE}${INVENTORY_PRODUCTS_PATH}`),
          axios.get(`${API_BASE}${INVENTORY_ITEMS_PATH}`),
        ]);

        if (prodRes.status === "fulfilled") {
          const payload = prodRes.value.data;
          const list = Array.isArray(payload)
            ? payload
            : payload?.items ?? payload?.data ?? [];
          setProducts(list.map(toUiProduct));
        } else {
          setProducts([]);
          console.error("Products fetch failed:", prodRes.reason);
          setError((e) => e || "Could not load products (/api/products).");
        }

        if (itemRes.status === "fulfilled") {
          const payload = itemRes.value.data;
          const list = Array.isArray(payload)
            ? payload
            : payload?.items ?? payload?.data ?? [];
          setItems(list.map(toUiItem));
        } else {
          setItems([]); // gracefully treat as 0
          console.warn("Items fetch failed (treating as 0):", itemRes.reason);
        }
      } catch (e) {
        console.error("Dashboard fetch error:", e);
        setProducts([]);
        setItems([]);
        setError("Could not load inventory. Check API routes.");
      }
    })();
  }, []);

  /* ---- Metrics (with discounts applied to products) ---- */
  const metrics = useMemo(() => {
    // Products (finished goods)
    const totalProductUnits = products.reduce((s, p) => s + (Number(p.stock) || 0), 0);
    const totalProductValue = products.reduce((s, p) => s + (Number(p.value) || 0), 0); // discounted

    // Items (materials/raw)
    const totalItemUnits = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
    const totalInventoryValue = items.reduce((s, i) => s + (Number(i.value) || 0), 0);

    const lowStockProducts = products.filter((p) => statusOf(p.stock) === "low-stock").length;
    const outOfStockProducts = products.filter((p) => statusOf(p.stock) === "out-of-stock").length;

    return {
      totalProductUnits,           // "Total Products" (units)
      totalItemUnits,              // "Total Items" (units)
      totalInventoryValue,         // value of inventory (items)
      totalProductValue,           // value of products (discounted)
      lowStockProducts,
      outOfStockProducts,
      totalValueOfStock: totalProductValue + totalInventoryValue, // combined
    };
  }, [products, items]);

  /* ---- Search over product table ---- */
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((r) =>
      `${r.name} ${r.category} ${r.stock} ${r.value}`.toLowerCase().includes(q)
    );
  }, [products, query]);

  /* ---- Donut segments from products only ---- */
  const donutSegments = useMemo(() => {
    const inStock = products.filter((r) => statusOf(r.stock) === "in-stock").length;
    const lowStock = products.filter((r) => statusOf(r.stock) === "low-stock").length;
    const outStock = products.filter((r) => statusOf(r.stock) === "out-of-stock").length;
    return [
      { label: "In Stock", value: inStock, color: "#10b981" },
      { label: "Low Stock", value: lowStock, color: "#f59e0b" },
      { label: "Out of Stock", value: outStock, color: "#ef4444" },
    ];
  }, [products]);

  /* ---- Draw donut whenever data changes ---- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const total = donutSegments.reduce((s, d) => s + d.value, 0) || 1;

    // ensure crisp canvas
    const dpr = window.devicePixelRatio || 1;
    const size = 250;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // reset before scaling so we don't accumulate transforms
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const r = Math.min(size, size) * 0.38;

    let start = -Math.PI / 2;
    donutSegments.forEach((seg) => {
      const angle = (seg.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + angle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();

      start += angle;
    });

    // donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 2;
    ctx.stroke();

    // center text shows TOTAL PRODUCT UNITS
    ctx.fillStyle = "#374151";
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(metrics.totalProductUnits || 0), cx, cy - 8);
    ctx.font = "12px Arial";
    ctx.fillStyle = "#6b7280";
    ctx.fillText("Units", cx, cy + 8);
  }, [donutSegments, metrics.totalProductUnits]);

  return (
    <div className="pul page-wrap ppv2">
      <Sidebarpul />

      <main className="main-content">
        <section className="dashboard">
          <header className="header">
            <h1>📦 Inventory Management Dashboard</h1>
            
          </header>

          {error && (
            <div
              role="alert"
              className="inline-alert"
            >
              {error}
            </div>
          )}

          {/* ===== Metrics ===== */}
          <section className="metrics-row">
            <article className="metric-card" aria-label="Total Products">
              <div className="metric-value">{metrics.totalProductUnits.toLocaleString()}</div>
              <div className="metric-label">Total Products</div>
            </article>
            <article className="metric-card" aria-label="Total Items">
              <div className="metric-value">{metrics.totalItemUnits.toLocaleString()}</div>
              <div className="metric-label">Total Items</div>
            </article>
            <article className="metric-card" aria-label="Low Stock Products">
              <div className="metric-value">{metrics.lowStockProducts.toLocaleString()}</div>
              <div className="metric-label">Low Stock Products</div>
            </article>
            <article className="metric-card" aria-label="Out of Stock Products">
              <div className="metric-value">{metrics.outOfStockProducts.toLocaleString()}</div>
              <div className="metric-label">Out of Stock</div>
            </article>
            <article className="metric-card" aria-label="Total Value of Items">
              <div className="metric-value">{money(metrics.totalInventoryValue)}</div>
              <div className="metric-label">Total Value of Items</div>
            </article>
            <article className="metric-card" aria-label="Total Value of Products">
              <div className="metric-value">{money(metrics.totalProductValue)}</div>
              <div className="metric-label">Total Value of Products</div>
            </article>
            <article className="metric-card" aria-label="Total Value of Inventory">
              <div className="metric-value">{money(metrics.totalValueOfStock)}</div>
              <div className="metric-label">Total Value of Inventory</div>
            </article>
          </section>

          {/* Charts + Alerts */}
          <section className="charts-alerts-row">
            <div className="chart-container">
              <h2 className="panel-title">📊 Stock Summary</h2>
              <div className="stock-chart-wrapper">
                <div className="pie-chart-container">
                  <canvas
                    ref={canvasRef}
                    id="stockChart"
                    width="250"
                    height="250"
                    aria-label="Stock distribution chart"
                  />
                </div>
                <div className="chart-legend" aria-hidden="true">
                  <div className="legend-item">
                    <div className="legend-color" style={{ background: "#10b981" }} />
                    <span className="legend-text">In Stock ({donutSegments[0].value})</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ background: "#f59e0b" }} />
                    <span className="legend-text">Low Stock ({donutSegments[1].value})</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color" style={{ background: "#ef4444" }} />
                    <span className="legend-text">Out of Stock ({donutSegments[2].value})</span>
                  </div>
                </div>
              </div>
            </div>

            <aside className="alerts-panel">
              <h2 className="panel-title">⚠️ Alerts & Notifications</h2>
              <div className="alerts-content">
                {[
                  ["Critical Stock Level", "Some products are out of stock"],
                  ["Low Stock Warning", "Products with ≤ 20 units need reordering"],
                  ["Reorder Reminder", "Review suppliers/pricing for items & products"],
                ].map(([title, desc], i) => (
                  <div className="alert-item" key={i}>
                    <div className="alert-icon">!</div>
                    <div className="alert-content">
                      <div className="alert-title">{title}</div>
                      <div className="alert-description">{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </section>

          {/* ===== Current Inventory (products) ===== */}
          <section className="inventory-table">
            <div className="table-header">
              <h2 className="table-title">📋 Current Inventory</h2>
              <input
                type="text"
                className="search-box"
                placeholder="Search products..."
                aria-label="Search products"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Stock</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((r, idx) => {
                  const status = statusOf(r.stock);
                  return (
                    <tr key={`${r.name}-${idx}`}>
                      <td><strong>{r.name}</strong></td>
                      <td>{r.stock} units</td>
                      {/* r.value is already discounted */}
                      <td>{money(r.value)}</td>
                      <td>
                        <span className={`status ${status}`}>
                          {status === "in-stock"
                            ? "In Stock"
                            : status === "low-stock"
                            ? "Low Stock"
                            : "Out of Stock"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan="4" style={{ padding: 16, textAlign: "center" }}>
                      No results
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </section>
      </main>
    </div>
  );
}
