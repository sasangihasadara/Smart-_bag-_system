// src/Components/HiruInventory/HiruInventory.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./HiruInventory.css";
import Sidebarhiru from "../Sidebar/Sidebarhiru";
import axios from "axios";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000";
const INVENTORY_PATH = "/api/inventory";

function HiruInventory() {
  const formRef = useRef(null);
  const itemIdRef = useRef(null);

  // Live items from API (mapped to {id, name, qty})
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("id-asc"); // id-asc | name-asc | qty-desc | qty-asc
  const [view, setView] = useState("table"); // table | cards
  const LOW_STOCK = 180;

  // 🔹 Minimum stock guard
  const MIN_STOCK = 20;

  // ---- API helpers ----
  const fetchItems = async () => {
    try {
      setErr("");
      setLoading(true);
      const { data } = await axios.get(`${API_BASE}${INVENTORY_PATH}`);
      // backend returns { items: [...] } with { id, name, quantity }
      const mapped = (data?.items || []).map((d) => ({
        id: d.id,
        name: d.name,
        qty: Number(d.quantity ?? 0),
      }));
      setItems(mapped);
    } catch (e) {
      console.error("fetch inventory error:", e);
      setErr(
        e?.response?.data?.message ||
          "Failed to load inventory. Check API_BASE and server."
      );
    } finally {
      setLoading(false);
    }
  };

  const getItemById = async (id) => {
    const { data } = await axios.get(
      `${API_BASE}${INVENTORY_PATH}/${encodeURIComponent(id)}`
    );
    return {
      id: data?.item?.id,
      name: data?.item?.name,
      qty: Number(data?.item?.quantity ?? 0),
    };
  };

  const updateItemQty = async (id, newQty) => {
    const { data } = await axios.put(
      `${API_BASE}${INVENTORY_PATH}/${encodeURIComponent(id)}`,
      { quantity: Number(newQty) }
    );
    return {
      id: data?.item?.id,
      name: data?.item?.name,
      qty: Number(data?.item?.quantity ?? newQty),
    };
  };

  // ✅ Adjust dynamic Reorder Level by a delta
  const adjustReorder = async (id, delta) => {
    await axios.post(
      `${API_BASE}${INVENTORY_PATH}/${encodeURIComponent(id)}/reorder-adjust`,
      { delta: Number(delta) }
    );
  };

  // initial load
  useEffect(() => {
    fetchItems();
  }, []);

  // focus first input on mount
  useEffect(() => {
    itemIdRef.current?.focus();
  }, []);

  // ---- derived values ----
  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = items.filter(
      (i) =>
        i.id.toLowerCase().includes(q) ||
        i.name.toLowerCase().includes(q) ||
        String(i.qty).includes(q)
    );
    switch (sortBy) {
      case "name-asc":
        list = list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "qty-desc":
        list = list.sort((a, b) => b.qty - a.qty);
        break;
      case "qty-asc":
        list = list.sort((a, b) => a.qty - b.qty);
        break;
      default:
        list = list.sort((a, b) => a.id.localeCompare(b.id)); // id-asc
    }
    return list;
  }, [items, search, sortBy]);

  const totals = useMemo(() => {
    const lowStock = items.filter((i) => i.qty < LOW_STOCK).length;
    return { totalItems: items.length, lowStock };
  }, [items]);

  // ---- form handlers (DEDUCT) ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    const form = formRef.current;
    const fd = new FormData(form);
    const data = Object.fromEntries(fd);

    const rawId = String(data.itemId || "").trim();
    const rawName = String(data.itemName || "").trim();
    const qtyToDeduct = Number(data.quantity);

    if (!rawId || !rawName || !data.quantity) {
      alert("Please fill in Item ID, Item Name, and Quantity to deduct.");
      return;
    }
    if (!Number.isFinite(qtyToDeduct) || qtyToDeduct <= 0) {
      alert("Enter a positive quantity to deduct.");
      return;
    }

    const id = rawId.toUpperCase();
    const name = rawName.trim();

    try {
      setLoading(true);

      // 1) Get the latest item from server
      const current = await getItemById(id);
      if (!current?.id) {
        alert(`Item with ID "${id}" not found.`);
        return;
      }

      // 2) Validate name match (case-insensitive)
      if (
        String(current.name || "").trim().toLowerCase() !==
        name.toLowerCase()
      ) {
        alert(
          `Item name does not match for ID ${id}.\n` +
            `Entered: "${name}" | Actual: "${current.name}".`
        );
        return;
      }

      // 3) Compute new quantity (no negatives allowed)
      if (qtyToDeduct > current.qty) {
        alert(
          `Insufficient stock.\nCurrent quantity: ${current.qty}\n` +
            `You tried to deduct: ${qtyToDeduct}`
        );
        return;
      }
      const newQty = current.qty - qtyToDeduct;

      // 🔹 Block if it would fall below minimum
      if (newQty < MIN_STOCK) {
        alert(
          `Minimum stock is ${MIN_STOCK}. This action would reduce "${current.name}" (ID: ${current.id}) to ${newQty}. No changes were made.`
        );
        return;
      }

      // 4) Update server: quantity
      const updated = await updateItemQty(id, newQty);

      // 4.1) ✅ Also raise dynamic Reorder Level by deducted amount
      await adjustReorder(id, qtyToDeduct);

      // 5) Update UI table
      setItems((prev) => {
        const idx = prev.findIndex((p) => p.id === id);
        if (idx === -1) return [...prev, updated];
        const copy = [...prev];
        copy[idx] = { ...copy[idx], qty: updated.qty, name: updated.name };
        return copy;
      });

      alert(`Item ${updated.name} Ordered Successfully!\n\n`);

      form.reset();
      itemIdRef.current?.focus();
    } catch (e2) {
      console.error("deduct/update error:", e2);
      const msg =
        e2?.response?.data?.message ||
        "Failed to deduct quantity. Please try again.";
      alert(`ERROR: ${msg}`);
      await fetchItems(); // resync view on error
    } finally {
      setLoading(false);
    }
  };

  const handleItemIdInput = (e) => {
    e.target.value = e.target.value.toUpperCase();
  };

  // progress helper for card bars
  const maxQty = Math.max(...items.map((i) => i.qty), 1);

  return (
    <div className="hiru">{/* PAGE WRAP SCOPE */}
      <div className="inventory-page">
        <Sidebarhiru />

        <div className="container">
          <header className="title-row">
            <h1>
              <span className="emoji">📦</span> Inventory
            </h1>
            <div className="title-actions">
              <button
                className="ghost-btn"
                onClick={() => setView("table")}
                aria-pressed={view === "table"}
              >
                Table
              </button>
              <button
                className="ghost-btn"
                onClick={() => setView("cards")}
                aria-pressed={view === "cards"}
              >
                Cards
              </button>
            </div>
          </header>

          {/* Status strip */}
          {loading && <div className="notice">Loading…</div>}
          {!loading && err && <div className="error">{err}</div>}

          {/* KPI cards */}
          <section className="kpis">
            <div className="kpi">
              <div className="kpi-top">
                <span className="kpi-label">Total Items</span>
                <span className="kpi-number">{totals.totalItems}</span>
              </div>
              <div className="kpi-bar">
                <span style={{ width: "100%" }} />
              </div>
            </div>

            <div className="kpi">
              <div className="kpi-top">
                <span className="kpi-label">Low Stock (&lt; 180)</span>
                <span className="kpi-number warn">{totals.lowStock}</span>
              </div>
              <div className="kpi-bar warn">
                <span
                  style={{
                    width: `${
                      (totals.lowStock / Math.max(totals.totalItems, 1)) * 100
                    }%`,
                  }}
                />
              </div>
            </div>
          </section>

          {/* Filters */}
          <section className="controls">
            <input
              className="search"
              placeholder="Search by ID, name, or quantity…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              disabled={loading}
            />
            <select
              className="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              disabled={loading}
            >
              <option value="id-asc">Sort by ID (A→Z)</option>
              <option value="name-asc">Sort by Name (A→Z)</option>
              <option value="qty-desc">Sort by Quantity (High→Low)</option>
              <option value="qty-asc">Sort by Quantity (Low→High)</option>
            </select>
            <button className="ghost-btn" onClick={fetchItems} disabled={loading}>
              Refresh
            </button>
          </section>

          {/* Two-column layout */}
          <div className="inventory-layout">
            {/* LEFT: Table or Cards */}
            <section className="left-pane">
              {view === "table" ? (
                <div className="table-card">
                  <table className="inventory-table">
                    <thead>
                      <tr>
                        <th>ITEM ID</th>
                        <th>ITEM NAME</th>
                        <th>QUANTITY</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSorted.map((i) => (
                        <tr key={i.id}>
                          <td className="item-id">{i.id}</td>
                          <td className="item-name">
                            {i.name}
                            {i.qty < LOW_STOCK && (
                              <span className="chip chip-warn">Low</span>
                            )}
                          </td>
                          <td>{i.qty}</td>
                        </tr>
                      ))}
                      {!loading && filteredSorted.length === 0 && (
                        <tr>
                          <td colSpan="3" className="empty">
                            No items found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="cards-grid">
                  {filteredSorted.map((i) => (
                    <article key={i.id} className="inv-card">
                      <header className="inv-card-head">
                        <span className="badge">{i.id}</span>
                        {i.qty < LOW_STOCK && (
                          <span className="chip chip-warn">Low stock</span>
                        )}
                      </header>
                      <h3 className="inv-name">{i.name}</h3>
                      <div className="inv-qty">
                        <span className="qty-label">Qty:</span>
                        <strong>{i.qty}</strong>
                      </div>
                      <div className="meter">
                        <span style={{ width: `${(i.qty / maxQty) * 100}%` }} />
                      </div>
                    </article>
                  ))}
                  {!loading && filteredSorted.length === 0 && (
                    <div className="empty cards-empty">No items found.</div>
                  )}
                </div>
              )}
            </section>

            {/* RIGHT: Deduct Quantity Form */}
            <section className="right-pane">
              <div className="form-card">
                <h2 className="form-title">Order item</h2>
                <form id="inventoryForm" ref={formRef} onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="itemId">
                      Item ID <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="itemId"
                      name="itemId"
                      placeholder="e.g., M001"
                      required
                      ref={itemIdRef}
                      onInput={handleItemIdInput}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="itemName">
                      Item Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="itemName"
                      name="itemName"
                      placeholder="Enter exact item name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="quantity">
                      Quantity to Deduct <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      min="1"
                      placeholder="1"
                      required
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit" className="submit-btn" disabled={loading}>
                      Submit
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HiruInventory;
